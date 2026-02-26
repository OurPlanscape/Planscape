import logging

import rasterio
from celery import chord, group
from core.flags import feature_enabled
from datasets.models import DataLayer, DataLayerType
from django.conf import settings
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.gis.geos import MultiPolygon
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from gis.core import get_storage_session
from planscape.celery import app
from planscape.exceptions import ForsysException, ForsysTimeoutException
from stands.models import Stand, StandSizeChoices
from stands.services import (
    calculate_stand_vector_stats_with_stand_list,
    calculate_stand_zonal_stats,
    calculate_stand_zonal_stats_api,
    create_stands_for_geometry,
    get_missing_stand_ids_for_datalayer_within_geometry,
)
from utils.cli_utils import call_forsys
from utils.frontend import get_frontend_url

from planning.models import (
    GeoPackageStatus,
    PlanningArea,
    PlanningAreaMapStatus,
    Scenario,
    ScenarioResultStatus,
    ScenarioType,
    TreatmentGoalUsageType,
)
from planning.services import (
    build_run_configuration,
    create_metrics_task,
    export_to_geopackage,
    get_acreage,
    get_available_stand_ids,
)

log = logging.getLogger(__name__)


@app.task()
def async_create_stands(planning_area_id: int, stand_size: StandSizeChoices) -> None:
    try:
        planning_area: PlanningArea = PlanningArea.objects.get(id=planning_area_id)
        log.info(f"Creating stands for {planning_area_id} for stand size {stand_size}")

        other_stands = Stand.objects.filter(
            size=stand_size, geometry__intersects=planning_area.geometry
        ).aggregate(union=UnionOp("geometry"))["union"]
        actual_geometry = planning_area.geometry

        if other_stands:
            actual_geometry = planning_area.geometry.difference(other_stands)

        if not actual_geometry:
            log.info("actual_geometry null, all good.")

        if actual_geometry.empty:
            log.info("No need to create stands, all good.")
            return

        match actual_geometry.geom_type:
            case "Polygon":
                actual_geometry = MultiPolygon([actual_geometry])
            case "MultiPolygon":
                pass
            case _:
                return

        for polygon in actual_geometry:
            create_stands_for_geometry(polygon, stand_size)
    except PlanningArea.DoesNotExist:
        log.warning(f"Planning Area with {planning_area_id} does not exist.")
        raise


@app.task(max_retries=3, retry_backoff=True)
def async_forsys_run(scenario_id: int) -> None:
    try:
        scenario = Scenario.objects.get(id=scenario_id)
    except Scenario.DoesNotExist:
        log.warning(f"Scenario with {scenario_id} does not exist.")
        raise
    try:
        log.info(f"Running scenario {scenario_id}")

        scenario.result_status = ScenarioResultStatus.RUNNING
        scenario.save(update_fields=["result_status", "updated_at"])

        call_forsys(scenario.pk)

    except ForsysTimeoutException:
        scenario.result_status = ScenarioResultStatus.TIMED_OUT
        scenario.save(update_fields=["result_status", "updated_at"])
        if hasattr(scenario, "results"):
            scenario.results.status = ScenarioResultStatus.TIMED_OUT
            scenario.results.save()
        log.error(
            "Running forsys for scenario %s timed-out. Might be too big.",
            scenario_id,
        )

    except ForsysException:
        scenario.result_status = ScenarioResultStatus.PANIC
        scenario.save(update_fields=["result_status", "updated_at"])
        if hasattr(scenario, "results"):
            scenario.results.status = ScenarioResultStatus.PANIC
            scenario.results.save()
        log.error(
            "A panic error happened while trying to call forsys for %s",
            scenario_id,
        )


@app.task()
def async_set_planning_area_status(
    planning_area_id: int,
    status: PlanningAreaMapStatus,
) -> None:
    """
    Set a PlanningArea's map_status. If re-run via command, only saves if map_status changed,
    or if stands_ready_at or metrics_ready_at were never set.
    """
    try:
        with transaction.atomic():
            planning_area: PlanningArea = PlanningArea.objects.select_for_update().get(
                pk=planning_area_id
            )
            update_fields: list[str] = []
            if planning_area.map_status != status:
                planning_area.map_status = status
                update_fields.append("map_status")

            if status == PlanningAreaMapStatus.STANDS_DONE:
                if planning_area.stands_ready_at is None:
                    planning_area.stands_ready_at = timezone.now()
                    update_fields.append("stands_ready_at")

            if status == PlanningAreaMapStatus.DONE:
                if planning_area.metrics_ready_at is None:
                    planning_area.metrics_ready_at = timezone.now()
                    update_fields.append("metrics_ready_at")

            if update_fields:
                planning_area.save(update_fields=update_fields)
                log.info(
                    "Planning Area %s map status set to %s (updated_fields=%s)",
                    planning_area_id,
                    status,
                    update_fields,
                )
            else:
                log.info(
                    "Planning Area %s map status already %s (no changes)",
                    planning_area_id,
                    status,
                )

    except PlanningArea.DoesNotExist:
        log.exception("Planning Area %s does not exist", planning_area_id)


@app.task()
def async_calculate_vector_metrics(
    stand_ids: list[int],
    datalayer_id: int,
) -> None:
    datalayer = DataLayer.objects.get(id=datalayer_id)
    calculate_stand_vector_stats_with_stand_list(
        stand_ids=stand_ids,
        datalayer=datalayer,
    )


@app.task(max_retries=3, retry_backoff=True)
def async_calculate_stand_metrics_with_stand_list(
    stand_ids: list,
    datalayer_id: int,
) -> None:
    """
    Calculates stand metrics based on stands list and datalayer.
    """
    try:
        stands = Stand.objects.filter(id__in=stand_ids).order_by("grid_key")
        datalayer: DataLayer = DataLayer.objects.get(pk=datalayer_id)
        if feature_enabled("API_ZONAL_STATS"):
            calculate_stand_zonal_stats_api(stands, datalayer)
        else:
            with rasterio.Env(get_storage_session()):
                calculate_stand_zonal_stats(stands, datalayer)
    except DataLayer.DoesNotExist:
        log.warning(f"DataLayer with id {datalayer_id} does not exist.")
        return


@app.task()
def prepare_planning_area(planning_area_id: int) -> int:
    planning_area = PlanningArea.objects.get(id=planning_area_id)

    log.info(f"Preparing planning area {planning_area_id}")
    slope = DataLayer.objects.all().by_meta_name("slope")
    distance_from_roads = DataLayer.objects.all().by_meta_name("distance_from_roads")
    datalayers = list(
        DataLayer.objects.all().by_meta_capability(
            TreatmentGoalUsageType.EXCLUSION_ZONE
        )
    ) + [
        slope,
        distance_from_roads,
    ]
    datalayers = list(filter(None, datalayers))

    if feature_enabled("CALCULATE_INCLUSION_ZONE"):
        includes = list(
            DataLayer.objects.all().by_meta_capability(
                TreatmentGoalUsageType.INCLUSION_ZONE
            )
        )
        datalayers.extend(includes)

    create_stand_metrics_jobs = []

    for datalayer in datalayers:
        for stand_size in StandSizeChoices:
            missing_stand_ids = get_missing_stand_ids_for_datalayer_within_geometry(
                geometry=planning_area.geometry,
                stand_size=stand_size,
                datalayer=datalayer,
            )
            if not missing_stand_ids:
                log.info(
                    f"No missing stand metrics for datalayer {datalayer.pk} and stand size {stand_size}"
                )
                continue
            batch_size = settings.STAND_METRICS_PAGE_SIZE
            for i in range(0, len(missing_stand_ids), batch_size):
                batch_stand_ids = list(missing_stand_ids)[i : i + batch_size]

                create_stand_metrics_jobs.append(
                    create_metrics_task(
                        stand_ids=batch_stand_ids,
                        datalayer=datalayer,
                    )
                )

    log.info(
        f"Spawning {len(create_stand_metrics_jobs)} vector and stand metrics tasks."
    )

    set_map_status_done = async_set_planning_area_status.si(
        planning_area.pk,
        PlanningAreaMapStatus.DONE,
    )
    set_map_status_failed = async_set_planning_area_status.si(
        planning_area.pk,
        PlanningAreaMapStatus.FAILED,
    )

    log.info(f"Lining up {len(create_stand_metrics_jobs)} for metrics.")

    stand_metrics_workflow = chord(
        header=group(create_stand_metrics_jobs), body=set_map_status_done
    ).on_error(set_map_status_failed)
    stand_metrics_workflow.apply_async()
    log.info(f"Triggered preparation workflow for planning area {planning_area_id}")
    return len(create_stand_metrics_jobs)


@app.task()
def async_pre_forsys_process(scenario_id: int) -> None:
    scenario = Scenario.objects.get(id=scenario_id)

    planning_area = scenario.planning_area

    excluded_datalayers = None
    excluded_areas_ids = scenario.configuration.get("excluded_areas_ids")
    if excluded_areas_ids:
        excluded_datalayers = DataLayer.objects.filter(pk__in=excluded_areas_ids)
    stand_ids = get_available_stand_ids(
        planning_area, scenario.get_stand_size(), excluded_datalayers
    )
    run_config = build_run_configuration(scenario)

    forsys_input = {
        "stand_ids": stand_ids,
        "datalayers": run_config["datalayers"],
        "variables": run_config["variables"],
        "run_with_patchmax": run_config["run_with_patchmax"],
        "projects_data": run_config["projects_data"],
    }

    with transaction.atomic():
        scenario = Scenario.objects.select_for_update().get(id=scenario_id)
        scenario.forsys_input = forsys_input  # type: ignore
        scenario.save(update_fields=["forsys_input", "updated_at"])


@app.task()
def prepare_scenarios_for_forsys_and_run(scenario_id: int):
    log.info(f"Preparing scenario {scenario_id} for Forsys run.")
    scenario = Scenario.objects.get(id=scenario_id)
    if scenario.result_status != ScenarioResultStatus.PENDING:
        log.info(
            f"Scenario {scenario_id} is not in a pending state. Current status: {scenario.result_status}"
        )
        return

    scenario_type = scenario.type
    if scenario_type == ScenarioType.PRESET:
        treatment_goal = scenario.treatment_goal
        if not treatment_goal:
            log.warning(
                f"Scenario {scenario_id} does not have an associated TreatmentGoal."
            )
            return
        datalayers = treatment_goal.get_raster_datalayers()  # type: ignore
    elif scenario_type == ScenarioType.CUSTOM:
        configuration = getattr(scenario, "configuration", {}) or {}
        priority_ids = configuration.get("priority_objectives") or []
        cobenefit_ids = configuration.get("cobenefits") or []
        datalayers = DataLayer.objects.filter(
            pk__in=[*priority_ids, *cobenefit_ids],
            type=DataLayerType.RASTER,
        )
    else:
        log.warning("Scenario %s has no scenario type set.", scenario_id)
        return

    tasks = [async_pre_forsys_process.si(scenario_id=scenario.pk)]
    for datalayer in datalayers:
        missing_stand_ids = get_missing_stand_ids_for_datalayer_within_geometry(
            geometry=scenario.planning_area.geometry,
            stand_size=scenario.get_stand_size(),
            datalayer=datalayer,
        )

        if missing_stand_ids:
            log.info(
                f"Calculating missing stand metrics for datalayer {datalayer.pk} and {len(missing_stand_ids)} stands"
            )
            batch_size = settings.STAND_METRICS_PAGE_SIZE
            for i in range(0, len(missing_stand_ids), batch_size):
                batch_stand_ids = list(missing_stand_ids)[i : i + batch_size]
                tasks.append(
                    async_calculate_stand_metrics_with_stand_list.si(
                        stand_ids=batch_stand_ids,
                        datalayer_id=datalayer.pk,
                    )
                )

    workflow_failed_task = async_mark_scenario_panic.si(scenario.pk)
    forsys_task = async_forsys_run.si(scenario_id=scenario.pk)

    workflow = chord(header=group(tasks), body=forsys_task).on_error(
        workflow_failed_task
    )
    workflow.apply_async()
    log.info(f"Prepared scenario {scenario_id} for Forsys run and triggered the run.")


@app.task()
def async_mark_scenario_panic(scenario_id: int) -> None:
    try:
        scenario = Scenario.objects.get(pk=scenario_id)
        scenario.result_status = ScenarioResultStatus.PANIC
        scenario.save(update_fields=["result_status", "updated_at"])
        log.info("Scenario %s marked as PANIC due to workflow error.", scenario_id)
    except Scenario.DoesNotExist:
        log.exception("Scenario %s does not exist (mark PANIC).", scenario_id)


@app.task()
def trigger_geopackage_generation():
    scenarios = Scenario.objects.filter(
        result_status__in=(ScenarioResultStatus.SUCCESS, ScenarioResultStatus.FAILURE),
        geopackage_status=GeoPackageStatus.PENDING,
    ).values_list("id", flat=True)
    log.info(f"Found {scenarios.count()} scenarios pending geopackage generation.")
    for scenario_id in scenarios:
        async_generate_scenario_geopackage.delay(scenario_id)
        log.info(f"Triggered geopackage generation for scenario {scenario_id}.")


@app.task()
def async_generate_scenario_geopackage(scenario_id: int) -> None:
    """
    This function is a placeholder for the actual implementation of generating
    a scenario geopackage. It should be implemented in the future.
    """
    log.info(f"Generating geopackage for scenario {scenario_id}")
    scenario = Scenario.objects.get(id=scenario_id)
    if scenario.result_status not in (
        ScenarioResultStatus.SUCCESS,
        ScenarioResultStatus.FAILURE,
    ):
        log.warning(
            f"Scenario {scenario_id} is not in successful or final failure state. Current status: {scenario.result_status}"
        )
        return

    if scenario.geopackage_status != GeoPackageStatus.PENDING:
        log.warning(
            f"Geopackage status for scenario {scenario_id} is {scenario.geopackage_status}. Will not generate geopackage."
        )
        return

    geopackage_path = export_to_geopackage(scenario)
    log.info(f"Geopackage generated at {geopackage_path}")
    return


@app.task()
def trigger_scenario_ready_emails():
    """
    Periodic task: find finished scenarios that still need a 'Scenario is ready'
    email and enqueue the send e-mail task for them.
    """
    scenarios = Scenario.objects.filter(
        result_status=ScenarioResultStatus.SUCCESS,
        ready_email_sent_at__isnull=True,
        user__isnull=False,
    ).exclude(user__email__exact="")

    count = scenarios.count()
    log.info("Found %s scenarios pending ready-email.", count)

    for scenario in scenarios:
        with transaction.atomic():
            scenario_for_update = Scenario.objects.select_for_update().get(
                pk=scenario.pk
            )
            if scenario_for_update.ready_email_sent_at is not None:
                continue

            scenario_for_update.ready_email_sent_at = timezone.now()
            scenario_for_update.save(
                update_fields=["ready_email_sent_at", "updated_at"]
            )

        async_send_email_scenario_finished.delay(scenario.pk)
        log.info("Queued ready-email for scenario %s.", scenario.pk)


@app.task()
def async_send_email_scenario_finished(scenario_id: int) -> None:
    """
    Send the 'Scenario is ready' email exactly-once.
    """
    try:
        scenario = Scenario.objects.select_related("planning_area", "user").get(
            pk=scenario_id
        )
        user = scenario.user
        email = (user.email or "").strip() if user else ""
        if not email:
            log.info(
                "Scenario %s finished but user has no email; skipping.", scenario_id
            )
            return

        link = get_frontend_url(
            f"plan/{scenario.planning_area_id}/scenario/{scenario.pk}"
        )

        context = {
            "user_full_name": user.get_full_name(),
            "scenario_name": scenario.name,
            "scenario_link": link,
        }

        subject = "Planscape Scenario is Ready"
        txt = render_to_string("email/scenario/scenario_completed.txt", context)
        html = render_to_string("email/scenario/scenario_completed.html", context)

        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            message=txt,
            html_message=html,
        )
        log.info("Email sent informing user that Scenario %s is finished.", scenario.pk)
    except Scenario.DoesNotExist:
        log.warning(
            "Scenario with pk %s does not exist. Cannot send email.", scenario_id
        )
    except Exception:
        log.exception(
            "Unexpected error while sending scenario-finished email.",
            extra={"scenario_id": scenario_id},
        )


@app.task()
def async_send_email_large_planning_area(planning_area_id: int) -> None:
    try:
        planning_area = PlanningArea.objects.select_related("user").get(
            pk=planning_area_id
        )
    except PlanningArea.DoesNotExist:
        log.warning(
            "Planning Area %s does not exist; cannot send oversize alert.",
            planning_area_id,
        )
        return

    acres = get_acreage(planning_area.geometry)
    if acres <= settings.OVERSIZE_PLANNING_AREA_ACRES:
        return

    user_email = (
        (planning_area.user.email or "").strip() if planning_area.user else "(unknown)"
    )
    link = get_frontend_url(f"plan/{planning_area.pk}")

    context = {
        "user_email": user_email,
        "planning_area_name": planning_area.name or f"Planning Area {planning_area.pk}",
        "acres": acres,
        "planning_area_link": link,
    }

    subject = "Large Planning Area Created"
    txt = render_to_string("email/planning/oversize_planning_area.txt", context)
    html = render_to_string("email/planning/oversize_planning_area.html", context)

    try:
        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.SUPPORT_EMAIL],
            message=txt,
            html_message=html,
        )
        log.info(
            "Sent oversize planning area alert for PA %s to %s",
            planning_area.pk,
            settings.SUPPORT_EMAIL,
        )
    except Exception:
        log.exception(
            "Failed sending oversize planning area alert.",
            extra={"planning_area_id": planning_area_id},
        )
