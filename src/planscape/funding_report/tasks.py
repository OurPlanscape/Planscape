import json
import logging
import smtplib
from collections import Counter
from datetime import timedelta

from celery import chord
from datasets.models import DataLayer
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from core.flags import feature_enabled
from funding_report.burn_emulator import (
    BurnEmulatorError,
    BurnEmulatorTransientError,
    request_job,
)
from funding_report.events import (
    STATUS_CHANGED_EVENT,
    publish_report_event,
    publish_report_status_by_id,
)
from funding_report.models import (
    AET_IMPROVEMENT_DEFAULT_PERCENTAGE,
    FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
    FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
    FLAME_LENGTH_REDUCTION_INTERVALS,
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingOpportunityReportRun,
    FundingOpportunityReportStatus,
    FundingReportMetric,
)
from funding_report.services import (
    build_datalayer_lookup,
    build_flame_length_reduction_results,
    build_funding_report_results,
    calculate_aet_improvement,
    calculate_biomass_volumes,
    calculate_project_area_delta,
    calculate_treatment_pixel_areas,
    export_funding_report_to_geopackage,
    generate_aet_clip_datalayer,
    generate_treatment_clip_datalayer,
    get_aet_percentual_datalayer,
    get_treatment_datalayer,
    merge_aet_improvement_into_results,
    treatment_layer_has_valid_data,
)
from planning.models import ProjectArea
from utils.frontend import get_frontend_url

from planscape.celery import app

log = logging.getLogger(__name__)

STALE_RUNNING_TIMEOUT = timedelta(minutes=30)


@app.task(
    bind=True,
    autoretry_for=(Exception, smtplib.SMTPDataError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def send_funding_opportunity_report_shared_link(
    self,
    recipient_email: str,
    public_url: str,
    inviter_name: str,
    scenario_name: str,
) -> None:
    context = {
        "PUBLIC_URL": public_url,
        "INVITER_NAME": inviter_name,
        "SCENARIO_NAME": scenario_name,
        "LOGO_URL": get_frontend_url("assets/svg/planscape-color-logo.svg"),
        # TODO: replace placeholder
        "RESULTS_PREVIEW_URL": get_frontend_url(
            "assets/png/funding-opportunity-report-sharing-email-thumb.png"
        ),
    }
    subject = f"[Planscape] Funding opportunity report shared from {inviter_name}"
    txt = render_to_string(
        "email/funding_report/shared_link_invite.txt",
        context,
    )
    html = render_to_string(
        "email/funding_report/shared_link_invite.html",
        context,
    )

    try:
        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            message=txt,
            html_message=html,
        )
        log.info("Funding opportunity report shared link sent to %s", recipient_email)
    except smtplib.SMTPDataError:
        if self.request.retries >= self.max_retries:
            log.exception("Failed to send funding report shared link email.")
        else:
            log.warning("Failed to send funding report shared link email. Retrying.")
        raise
    except Exception:
        if self.request.retries >= self.max_retries:
            log.exception(
                "Unexpected failure sending funding report shared link email."
            )
        else:
            log.warning(
                "Unexpected failure sending funding report shared link email. Retrying."
            )
        raise


def update_report_components(
    report_id: int,
    *,
    run_started_at: str | None = None,
    expected_job_id: str | None = None,
    active_burn_only: bool = False,
    active_calculation_only: bool = False,
    **changes,
) -> bool:
    """Serialize completion decisions and ignore responses from earlier runs."""
    with transaction.atomic():
        report = (
            FundingOpportunityReport.objects.select_for_update()
            .filter(pk=report_id)
            .first()
        )
        if report is None:
            return False
        if run_started_at is not None and (
            report.burn_simulation_started_at is None
            or report.burn_simulation_started_at.isoformat() != run_started_at
        ):
            return False
        if (
            expected_job_id is not None
            and report.burn_simulation_job_id != expected_job_id
        ):
            return False
        active = (
            FundingOpportunityReportStatus.PENDING,
            FundingOpportunityReportStatus.RUNNING,
        )
        if active_burn_only and report.burn_simulation_status not in active:
            return False
        if active_calculation_only and report.calculation_status not in active:
            return False
        previous_status = report.status
        for field, value in changes.items():
            setattr(report, field, value)
        # Legacy calculation-only callers explicitly supply their overall status.
        if "status" not in changes:
            report.status = report.get_overall_status()
        report.save(
            update_fields=[*changes, "status", "updated_at"]
            if "status" not in changes
            else [*changes, "updated_at"]
        )
        status, calculation_status, burn_status = (
            report.status,
            report.calculation_status,
            report.burn_simulation_status,
        )
        transaction.on_commit(
            lambda: publish_report_status_by_id(
                report_id, status, calculation_status, burn_status
            )
        )
        if (
            previous_status != status
            and status == FundingOpportunityReportStatus.SUCCESS
        ):
            transaction.on_commit(
                lambda: async_generate_funding_report_geopackage.delay(report_id)
            )
            transaction.on_commit(
                lambda: async_send_email_funding_report_finished.delay(report_id)
            )
        return True


def dispatch_report_work(
    callback, report_id: int, run_started_at: str | None, component: str
) -> None:
    """A broker failure must not strand a component in its active state."""
    try:
        callback()
    except Exception:
        log.exception(
            "Failed to dispatch %s for funding report %s", component, report_id
        )
        update_report_components(
            report_id,
            run_started_at=run_started_at,
            active_calculation_only=component == "calculation_status",
            active_burn_only=component == "burn_simulation_status",
            **{component: FundingOpportunityReportStatus.FAILED},
        )


@app.task()
def async_set_status(
    funding_opportunity_report_id: int,
    status: str | None = None,
    calculation_status: str | None = None,
    burn_simulation_status: str | None = None,
    run_started_at: str | None = None,
) -> None:
    changes = {
        key: value
        for key, value in {
            "status": status,
            "calculation_status": calculation_status,
            "burn_simulation_status": burn_simulation_status,
        }.items()
        if value is not None
    }
    update_report_components(
        funding_opportunity_report_id,
        run_started_at=run_started_at,
        active_calculation_only=calculation_status is not None,
        active_burn_only=burn_simulation_status is not None,
        **changes,
    )


@app.task()
def async_calculate_funding_report_delta(
    project_area_id: int,
    baseline_layer_id: int,
    value_layer_id: int,
    year: int,
    metric: str,
    from_ft: float = FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
    to_ft: float = FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
) -> dict | None:
    try:
        project_area = ProjectArea.objects.get(pk=project_area_id)
    except ProjectArea.DoesNotExist:
        log.warning(
            "ProjectArea with pk %s does not exist. "
            "Cannot calculate funding report delta.",
            project_area_id,
        )
        return None

    datalayer_lookup = {
        (metric, year, True): DataLayer.objects.get(pk=baseline_layer_id),
        (metric, year, False): DataLayer.objects.get(pk=value_layer_id),
    }
    try:
        return calculate_project_area_delta(
            project_area=project_area,
            metric=metric,
            year=year,
            datalayer_lookup=datalayer_lookup,
            from_ft=from_ft,
            to_ft=to_ft,
        )
    except Exception as exc:
        log.exception(
            "Failed to calculate funding report delta for project area %s, "
            "metric %s, year %s.",
            project_area_id,
            metric,
            year,
        )
        return {
            "error": str(exc),
            "project_id": project_area_id,
            "proj_id": (project_area.data or {}).get("proj_id"),
            "variable": metric,
            "year": year,
        }


@app.task()
def async_generate_treatment_datalayer(
    funding_opportunity_report_id: int,
) -> dict | None:
    if get_treatment_datalayer() is None:
        log.warning(
            "No funding report treatment datalayer configured. Skipping "
            "treatment datalayer generation for report %s.",
            funding_opportunity_report_id,
        )
        return None

    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        datalayer = generate_treatment_clip_datalayer(report=report)
        return {"kind": "treatment_datalayer", "datalayer_id": datalayer.pk}
    except Exception as exc:
        log.exception(
            "Failed to generate treatment datalayer for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "treatment_datalayer", "error": str(exc)}


@app.task()
def async_generate_aet_datalayer(
    funding_opportunity_report_id: int,
) -> dict | None:
    if get_aet_percentual_datalayer() is None:
        log.warning(
            "No funding report AET percentual datalayer configured. Skipping "
            "AET datalayer generation for report %s.",
            funding_opportunity_report_id,
        )
        return None

    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        datalayer = generate_aet_clip_datalayer(report=report)
        return {"kind": "aet_datalayer", "datalayer_id": datalayer.pk}
    except Exception as exc:
        log.exception(
            "Failed to generate AET datalayer for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "aet_datalayer", "error": str(exc)}


@app.task()
def async_calculate_treatment_areas(
    funding_opportunity_report_id: int,
) -> dict | None:
    if get_treatment_datalayer() is None:
        log.warning(
            "No funding report treatment datalayer configured. Skipping "
            "treatment pixel area calculation for report %s.",
            funding_opportunity_report_id,
        )
        return None

    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        result = calculate_treatment_pixel_areas(report=report)
        return {"kind": "treatment_areas", **result}
    except Exception as exc:
        log.exception(
            "Failed to calculate treatment pixel areas for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "treatment_areas", "error": str(exc)}


@app.task()
def async_calculate_aet_improvement(
    funding_opportunity_report_id: int,
    percentage: float = AET_IMPROVEMENT_DEFAULT_PERCENTAGE,
) -> dict | None:
    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        result = calculate_aet_improvement(report=report, percentage=percentage)
        return {"kind": "aet_improvement", **result}
    except Exception as exc:
        log.exception(
            "Failed to calculate AET improvement for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "aet_improvement", "error": str(exc)}


@app.task(
    autoretry_for=(smtplib.SMTPException, OSError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def async_send_email_funding_report_finished(
    funding_opportunity_report_id: int,
) -> None:
    try:
        report = FundingOpportunityReport.objects.select_related(
            "created_by",
            "scenario",
            "scenario__planning_area",
        ).get(pk=funding_opportunity_report_id)
    except FundingOpportunityReport.DoesNotExist:
        log.warning(
            "FundingOpportunityReport with pk %s does not exist. Cannot send email.",
            funding_opportunity_report_id,
        )
        return

    user = report.created_by
    if not user:
        log.info(
            "FundingOpportunityReport %s completed but has no created_by user; "
            "skipping email.",
            funding_opportunity_report_id,
        )
        return

    funding_report_link = get_frontend_url(
        f"plan/{report.scenario.planning_area_id}/scenario/{report.scenario_id}/funding"
    )

    context = {
        "user_full_name": user.get_full_name(),
        "scenario_name": report.scenario.name,
        "funding_report_link": funding_report_link,
    }

    subject = "Planscape Funding Opportunity Report is Ready"
    txt = render_to_string(
        "email/funding_report/funding_report_completed.txt",
        context,
    )
    html = render_to_string(
        "email/funding_report/funding_report_completed.html",
        context,
    )

    send_mail(
        subject=subject,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        message=txt,
        html_message=html,
    )

    log.info(
        "Email sent informing user that FundingOpportunityReport %s is finished.",
        report.pk,
    )


@app.task()
def async_calculate_biomass_volumes(
    funding_opportunity_report_id: int,
) -> dict | None:
    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        result = calculate_biomass_volumes(report=report)
        return {"kind": "biomass_volumes", **result}
    except Exception as exc:
        log.exception(
            "Failed to calculate biomass volumes for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "biomass_volumes", "error": str(exc)}


@app.task()
def async_generate_funding_report_geopackage(
    funding_opportunity_report_id: int,
) -> None:
    try:
        report = FundingOpportunityReport.objects.select_related("scenario").get(
            pk=funding_opportunity_report_id
        )
        export_funding_report_to_geopackage(report)
    except Exception:
        log.exception(
            "Failed to generate geopackage for funding report %s.",
            funding_opportunity_report_id,
        )


@app.task()
def async_finalize_funding_report_results(
    project_results: list[dict | None],
    funding_opportunity_report_id: int,
    run_started_at: str | None = None,
) -> None:
    successes = []
    errors = []
    treatment_errors = []
    treatment_datalayer_id = None
    aet_datalayer_id = None
    treatment_areas = None
    aet_improvement = None
    biomass_volumes = None

    for result in project_results:
        if result is None:
            continue
        kind = result.get("kind")
        if "error" in result:
            (treatment_errors if kind else errors).append(result)
            continue
        match kind:
            case "treatment_datalayer":
                treatment_datalayer_id = result["datalayer_id"]
            case "aet_datalayer":
                aet_datalayer_id = result["datalayer_id"]
            case "treatment_areas":
                treatment_areas = {
                    "projects": result["projects"],
                    "total": result["total"],
                }
            case "aet_improvement":
                aet_improvement = result
            case "biomass_volumes":
                biomass_volumes = result
            case _:
                successes.append(result)

    flame_successes = [r for r in successes if "interval" in r]
    non_flame_successes = [r for r in successes if "interval" not in r]

    results = build_funding_report_results(non_flame_successes)
    flame_results = build_flame_length_reduction_results(flame_successes)
    if flame_results["summary"] or flame_results["projects"]:
        results["summary"]["TOTAL_FLAME_SEVERITY"] = flame_results["summary"]
        results["projects"]["TOTAL_FLAME_SEVERITY"] = flame_results["projects"]
    if aet_improvement is not None:
        results = merge_aet_improvement_into_results(results, aet_improvement)
    if biomass_volumes is not None:
        results["summary"]["BIOMASS_VOLUMES"] = biomass_volumes["summary"]
        results["projects"]["BIOMASS_VOLUMES"] = biomass_volumes["project_areas"]
    if treatment_areas is not None:
        results["treatment_areas"] = treatment_areas
    if treatment_errors:
        results["treatment_errors"] = treatment_errors
    if errors:
        results["errors"] = errors

    final_status = (
        FundingOpportunityReportStatus.FAILED
        if errors
        else FundingOpportunityReportStatus.SUCCESS
    )

    update_fields: dict = {
        "results": results,
        "calculation_status": final_status,
    }
    if treatment_datalayer_id is not None:
        update_fields["treatment_datalayer_id"] = treatment_datalayer_id
    if aet_datalayer_id is not None:
        update_fields["aet_datalayer_id"] = aet_datalayer_id

    if run_started_at is None:
        update_fields["status"] = final_status
    update_report_components(
        funding_opportunity_report_id,
        run_started_at=run_started_at,
        active_calculation_only=True,
        **update_fields,
    )


@app.task()
def async_funding_report_calculation(
    funding_opportunity_report_id: int, run_started_at: str | None = None
) -> None:
    with transaction.atomic():
        try:
            report = (
                FundingOpportunityReport.objects.select_for_update(of=("self",))
                .select_related("scenario__planning_area")
                .get(pk=funding_opportunity_report_id)
            )
        except FundingOpportunityReport.DoesNotExist:
            log.warning(
                "FundingOpportunityReport with pk %s does not exist. "
                "Cannot run report.",
                funding_opportunity_report_id,
            )
            return
        if run_started_at is not None and (
            report.burn_simulation_started_at is None
            or report.burn_simulation_started_at.isoformat() != run_started_at
            or report.calculation_status != FundingOpportunityReportStatus.PENDING
        ):
            return
        if (
            report.calculation_status == FundingOpportunityReportStatus.RUNNING
            and timezone.now() - report.updated_at < STALE_RUNNING_TIMEOUT
        ):
            log.warning(
                "FundingOpportunityReport with pk %s is already running, "
                "skipping duplicate dispatch.",
                funding_opportunity_report_id,
            )
            return
        update_report_components(
            funding_opportunity_report_id,
            run_started_at=run_started_at,
            calculation_status=FundingOpportunityReportStatus.RUNNING,
        )
        project_area_ids = list(
            report.scenario.project_areas.values_list("id", flat=True)
        )

        try:
            if not project_area_ids or not treatment_layer_has_valid_data(
                report.scenario
            ):
                update_report_components(
                    funding_opportunity_report_id,
                    run_started_at=run_started_at,
                    calculation_status=FundingOpportunityReportStatus.EMPTY,
                    burn_simulation_status=FundingOpportunityReportStatus.EMPTY,
                )
                return

            datalayer_lookup = build_datalayer_lookup()
            tasks = []
            for metric in FundingReportMetric:
                for year in FUNDING_REPORT_YEARS:
                    try:
                        baseline_layer = datalayer_lookup[(metric.value, year, True)]
                        value_layer = datalayer_lookup[(metric.value, year, False)]
                    except KeyError:
                        raise ValueError(
                            "Missing funding report datalayer for variable="
                            f"{metric.value!r}, year={year}."
                        )
                    intervals = (
                        FLAME_LENGTH_REDUCTION_INTERVALS
                        if metric == FundingReportMetric.TOTAL_FLAME_SEVERITY
                        else (
                            (
                                FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
                                FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
                            ),
                        )
                    )
                    for from_ft, to_ft in intervals:
                        tasks.extend(
                            async_calculate_funding_report_delta.si(
                                project_area_id=project_area_id,
                                baseline_layer_id=baseline_layer.pk,
                                value_layer_id=value_layer.pk,
                                year=year,
                                metric=metric.value,
                                from_ft=from_ft,
                                to_ft=to_ft,
                            )
                            for project_area_id in project_area_ids
                        )
            tasks.append(
                async_generate_treatment_datalayer.si(
                    funding_opportunity_report_id=funding_opportunity_report_id,
                )
            )
            tasks.append(
                async_calculate_treatment_areas.si(
                    funding_opportunity_report_id=funding_opportunity_report_id,
                )
            )
            tasks.append(
                async_calculate_aet_improvement.si(
                    funding_opportunity_report_id=funding_opportunity_report_id,
                )
            )
            tasks.append(
                async_generate_aet_datalayer.si(
                    funding_opportunity_report_id=funding_opportunity_report_id,
                )
            )
            tasks.append(
                async_calculate_biomass_volumes.si(
                    funding_opportunity_report_id=funding_opportunity_report_id,
                )
            )
            callback = async_finalize_funding_report_results.s(
                funding_opportunity_report_id=funding_opportunity_report_id,
                run_started_at=run_started_at,
            ).on_error(
                async_set_status.si(
                    funding_opportunity_report_id=funding_opportunity_report_id,
                    calculation_status=FundingOpportunityReportStatus.FAILED,
                    run_started_at=run_started_at,
                )
            )
            transaction.on_commit(
                lambda: dispatch_report_work(
                    lambda: chord(tasks)(callback),
                    funding_opportunity_report_id,
                    run_started_at,
                    "calculation_status",
                )
            )
        except Exception:
            update_report_components(
                funding_opportunity_report_id,
                run_started_at=run_started_at,
                calculation_status=FundingOpportunityReportStatus.FAILED,
            )
            log.exception(
                "Failed to dispatch funding report calculations %s",
                funding_opportunity_report_id,
            )


BURN_SIMULATION_TIMEOUT = timedelta(hours=24)


def apply_burn_response(
    report_id: int, run_started_at: str, response: dict, *, expected_job_id=None
):
    statuses = {
        "pending": FundingOpportunityReportStatus.RUNNING,
        "cached": FundingOpportunityReportStatus.SUCCESS,
        "failed": FundingOpportunityReportStatus.FAILED,
    }
    update_report_components(
        report_id,
        run_started_at=run_started_at,
        expected_job_id=expected_job_id,
        active_burn_only=True,
        burn_simulation_status=statuses[response["status"]],
        burn_simulation_job_id=response["job_id"],
        burn_simulation_response=response,
    )


def fail_burn_job(
    report_id: int, run_started_at: str, message: str, *, expected_job_id=None
):
    update_report_components(
        report_id,
        run_started_at=run_started_at,
        expected_job_id=expected_job_id,
        active_burn_only=True,
        burn_simulation_status=FundingOpportunityReportStatus.FAILED,
        burn_simulation_response={
            "status": "failed",
            "error": message,
            "job_id": expected_job_id,
        },
    )


@app.task(bind=True, max_retries=3)
def async_call_burn_emulator(
    self, funding_opportunity_report_id: int, run_started_at: str | None = None
) -> None:
    with transaction.atomic():
        report = (
            FundingOpportunityReport.objects.select_for_update()
            .filter(pk=funding_opportunity_report_id)
            .first()
        )
        if report is None:
            return
        if report.burn_simulation_started_at is None:
            report.burn_simulation_started_at = timezone.now()
            report.save(update_fields=["burn_simulation_started_at"])
        current_run = report.burn_simulation_started_at.isoformat()
        if run_started_at is not None and run_started_at != current_run:
            return
        run_started_at = current_run
        if report.burn_simulation_status not in (
            FundingOpportunityReportStatus.PENDING,
            FundingOpportunityReportStatus.RUNNING,
        ):
            return
        if report.burn_simulation_job_id:
            return
        if (
            timezone.now() - report.burn_simulation_started_at
            >= BURN_SIMULATION_TIMEOUT
        ):
            fail_burn_job(
                report.pk, run_started_at, "Burn simulation exceeded 24 hours."
            )
            return
        update_report_components(
            report.pk,
            run_started_at=run_started_at,
            burn_simulation_status=FundingOpportunityReportStatus.RUNNING,
        )
    try:
        geometry = report.scenario.planning_area.geometry
        if geometry is None:
            raise ValueError(
                f"Planning area for scenario {report.scenario_id} has no geometry."
            )
        geometry = geometry.transform(4326, clone=True)
        response = request_job("POST", geometry=json.loads(geometry.geojson))
        apply_burn_response(report.pk, run_started_at, response)
    except BurnEmulatorTransientError as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(
                exc=exc,
                args=(report.pk,),
                kwargs={"run_started_at": run_started_at},
                countdown=min(300, 10 * 2**self.request.retries),
            )
        fail_burn_job(report.pk, run_started_at, str(exc))
    except Exception as exc:
        log.exception("Burn-emulator submission failed for report %s", report.pk)
        fail_burn_job(report.pk, run_started_at, str(exc)[:1000])


@app.task()
def check_burn_emulator_status(funding_opportunity_report_id: int) -> None:
    report = FundingOpportunityReport.objects.filter(
        pk=funding_opportunity_report_id
    ).first()
    if (
        report is None
        or report.burn_simulation_status != FundingOpportunityReportStatus.RUNNING
    ):
        return
    if report.burn_simulation_started_at is None:
        return
    run_started_at = report.burn_simulation_started_at.isoformat()
    if timezone.now() - report.burn_simulation_started_at >= BURN_SIMULATION_TIMEOUT:
        fail_burn_job(
            report.pk,
            run_started_at,
            "Burn simulation exceeded 24 hours.",
            expected_job_id=report.burn_simulation_job_id,
        )
        return
    if not report.burn_simulation_job_id:
        # Submission and its bounded retries own POST; polling must not duplicate them.
        return
    try:
        response = request_job("GET", report.burn_simulation_job_id)
        apply_burn_response(
            report.pk,
            run_started_at,
            response,
            expected_job_id=report.burn_simulation_job_id,
        )
    except BurnEmulatorTransientError:
        log.warning(
            "Transient burn-emulator poll failure for report %s",
            report.pk,
            exc_info=True,
        )
    except BurnEmulatorError as exc:
        fail_burn_job(
            report.pk,
            run_started_at,
            str(exc),
            expected_job_id=report.burn_simulation_job_id,
        )


@app.task()
def poll_burn_emulator_jobs() -> None:
    if not feature_enabled("FOR_WITH_BURN_EMULATOR"):
        log.info("Feature FOR_WITH_BURN_EMULATOR disabled.")
        return
    
    report_ids = FundingOpportunityReport.objects.filter(
        burn_simulation_status=FundingOpportunityReportStatus.RUNNING,
        burn_simulation_started_at__isnull=False,
    ).values_list("pk", flat=True)
    for report_id in report_ids.iterator():
        check_burn_emulator_status.delay(report_id)


# TODO: deprecate this method once FOR: Catastrophic fire reduction section is released
@app.task()
def run_funding_opportunity_report(funding_opportunity_report_id: int) -> None:
    with transaction.atomic():
        try:
            report = (
                FundingOpportunityReport.objects.select_for_update(of=("self",))
                .select_related("scenario__planning_area")
                .get(pk=funding_opportunity_report_id)
            )
        except FundingOpportunityReport.DoesNotExist:
            log.warning(
                "FundingOpportunityReport with pk %s does not exist. "
                "Cannot run report.",
                funding_opportunity_report_id,
            )
            return
        if (
            report.status == FundingOpportunityReportStatus.RUNNING
            and timezone.now() - report.updated_at < STALE_RUNNING_TIMEOUT
        ):
            log.warning(
                "FundingOpportunityReport with pk %s is already running, "
                "skipping duplicate dispatch.",
                funding_opportunity_report_id,
            )
            return
        report.status = FundingOpportunityReportStatus.RUNNING
        report.calculation_status = FundingOpportunityReportStatus.RUNNING
        report.save(update_fields=["status", "calculation_status", "updated_at"])
        publish_report_event(STATUS_CHANGED_EVENT, report)
        project_area_ids = list(
            report.scenario.project_areas.values_list("id", flat=True)
        )

    try:
        if not project_area_ids or not treatment_layer_has_valid_data(report.scenario):
            FundingOpportunityReport.objects.filter(
                pk=funding_opportunity_report_id
            ).update(status=FundingOpportunityReportStatus.EMPTY)
            publish_report_status_by_id(
                funding_opportunity_report_id, FundingOpportunityReportStatus.EMPTY
            )
            return

        datalayer_lookup = build_datalayer_lookup()
        tasks = []
        for metric in FundingReportMetric:
            for year in FUNDING_REPORT_YEARS:
                try:
                    baseline_layer = datalayer_lookup[(metric.value, year, True)]
                    value_layer = datalayer_lookup[(metric.value, year, False)]
                except KeyError:
                    raise ValueError(
                        "Missing funding report datalayer for variable="
                        f"{metric.value!r}, year={year}."
                    )
                intervals = (
                    FLAME_LENGTH_REDUCTION_INTERVALS
                    if metric == FundingReportMetric.TOTAL_FLAME_SEVERITY
                    else (
                        (
                            FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
                            FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
                        ),
                    )
                )
                for from_ft, to_ft in intervals:
                    tasks.extend(
                        async_calculate_funding_report_delta.si(
                            project_area_id=project_area_id,
                            baseline_layer_id=baseline_layer.pk,
                            value_layer_id=value_layer.pk,
                            year=year,
                            metric=metric.value,
                            from_ft=from_ft,
                            to_ft=to_ft,
                        )
                        for project_area_id in project_area_ids
                    )
        tasks.append(
            async_generate_treatment_datalayer.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_calculate_treatment_areas.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_calculate_aet_improvement.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_generate_aet_datalayer.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_calculate_biomass_volumes.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        callback = async_finalize_funding_report_results.s(
            funding_opportunity_report_id=funding_opportunity_report_id,
        ).on_error(
            async_set_status.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
                status=FundingOpportunityReportStatus.FAILED,
            )
        )
        chord(tasks)(callback)
    except Exception:
        FundingOpportunityReport.objects.filter(
            pk=funding_opportunity_report_id
        ).update(status=FundingOpportunityReportStatus.FAILED)
        raise


@app.task()
def run_funding_opportunity_report_with_burn_emmulator(
    funding_opportunity_report_id: int,
) -> None:
    with transaction.atomic():
        report = (
            FundingOpportunityReport.objects.select_for_update(of=("self",))
            .select_related("scenario")
            .filter(pk=funding_opportunity_report_id)
            .first()
        )
        if report is None:
            return
        if report.burn_simulation_started_at is not None and (
            report.calculation_status == FundingOpportunityReportStatus.RUNNING
            or report.burn_simulation_status == FundingOpportunityReportStatus.RUNNING
            or report.calculation_status == FundingOpportunityReportStatus.PENDING
        ):
            return
        started_at = timezone.now()
        run_started_at = started_at.isoformat()
        update_report_components(
            report.pk,
            status=FundingOpportunityReportStatus.RUNNING,
            calculation_status=FundingOpportunityReportStatus.PENDING,
            burn_simulation_status=FundingOpportunityReportStatus.RUNNING,
            burn_simulation_started_at=started_at,
            burn_simulation_job_id=None,
            burn_simulation_response=None,
        )
        try:
            empty = (
                not report.scenario.project_areas.exists()
                or not treatment_layer_has_valid_data(report.scenario)
            )
        except Exception:
            update_report_components(
                report.pk,
                calculation_status=FundingOpportunityReportStatus.FAILED,
                burn_simulation_status=FundingOpportunityReportStatus.FAILED,
            )
            log.exception("Funding report preflight failed for %s", report.pk)
            return
        if empty:
            update_report_components(
                report.pk,
                calculation_status=FundingOpportunityReportStatus.EMPTY,
                burn_simulation_status=FundingOpportunityReportStatus.EMPTY,
            )
            return
        transaction.on_commit(
            lambda: dispatch_report_work(
                lambda: async_funding_report_calculation.delay(
                    report.pk, run_started_at=run_started_at
                ),
                report.pk,
                run_started_at,
                "calculation_status",
            )
        )
        transaction.on_commit(
            lambda: dispatch_report_work(
                lambda: async_call_burn_emulator.delay(
                    report.pk, run_started_at=run_started_at
                ),
                report.pk,
                run_started_at,
                "burn_simulation_status",
            )
        )


@app.task()
def send_weekly_funding_report_users_report() -> None:
    recipient_email = settings.WEEKLY_FUNDING_REPORT_USERS_REPORT_EMAIL
    if not recipient_email:
        log.warning("No recipient configured for weekly funding report users report.")
        return

    end = timezone.now()
    start = end - timedelta(days=7)

    emails = FundingOpportunityReportRun.objects.filter(
        created_at__gte=start,
        created_at__lt=end,
    ).values_list("email", flat=True)

    email_counts = Counter(
        email.strip().lower() for email in emails if email and email.strip()
    )

    rows = [
        {"email": email, "count": count}
        for email, count in sorted(email_counts.items())
    ]

    context = {
        "start": start,
        "end": end,
        "rows": rows,
        "total_runs": sum(email_counts.values()),
        "unique_users": len(rows),
    }

    subject = "Weekly Planscape Funding Report Users"
    txt = render_to_string(
        "email/funding_report/weekly_report_users.txt",
        context,
    )
    html = render_to_string(
        "email/funding_report/weekly_report_users.html",
        context,
    )

    send_mail(
        subject=subject,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        message=txt,
        html_message=html,
    )
