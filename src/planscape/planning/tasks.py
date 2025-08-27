import logging

import rasterio
from django.conf import settings
from django.db import transaction
from django.core.paginator import Paginator
from core.flags import feature_enabled
from datasets.models import DataLayer, DataLayerType
from django.db import connection
from gis.core import get_storage_session
from planning.models import Scenario, ScenarioResultStatus
from planning.services import (
    get_datalayer_thresholds,
    get_min_project_area,
    get_max_treatable_area,
)
from stands.models import Stand
from stands.services import calculate_stand_zonal_stats, get_datalayer_metric
from utils.cli_utils import call_forsys

from planscape.celery import app
from planscape.exceptions import ForsysException, ForsysTimeoutException

log = logging.getLogger(__name__)


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
        scenario.save()
        stand_size = scenario.get_stand_size()
        planning_area_geom = scenario.planning_area.geometry

        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT public.generate_stands_for_planning_area(
                    ST_GeomFromText(%s, %s),
                    %s,
                    %s, %s
                );
                """,
                [
                    planning_area_geom.wkt,
                    planning_area_geom.srid or 4269,
                    stand_size,
                    settings.HEX_GRID_ORIGIN_X,
                    settings.HEX_GRID_ORIGIN_Y,
                ],
            )
            inserted = cur.fetchone()[0]

        log.info(
            "generate_stands_for_planning_area inserted %s stands (size=%s) for scenario %s",
            inserted,
            stand_size,
            scenario_id,
        )

        call_forsys(scenario.pk)

        if not feature_enabled("FORSYS_VIA_API"):
            scenario.result_status = ScenarioResultStatus.SUCCESS
        scenario.save()
        async_generate_scenario_geopackage.apply_async(
            args=(scenario.id,),
            countdown=120,
        )
    except ForsysTimeoutException:
        # this case should not happen as is, as the default parameter
        # for call_forsys timeout is None.
        scenario.result_status = ScenarioResultStatus.TIMED_OUT
        scenario.save()
        if hasattr(scenario, "results"):
            scenario.results.status = ScenarioResultStatus.TIMED_OUT
            scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"Running forsys for scenario {scenario_id} timed-out. Might be too big."
        )
    except ForsysException:
        scenario.result_status = ScenarioResultStatus.PANIC
        scenario.save()
        if hasattr(scenario, "results"):
            scenario.results.status = ScenarioResultStatus.PANIC
            scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"A panic error happened while trying to call forsys for {scenario_id}"
        )


@app.task(max_retries=3, retry_backoff=True)
def async_calculate_stand_metrics(scenario_id: int, datalayer_name: str) -> None:
    scenario = Scenario.objects.get(id=scenario_id)
    stand_size = scenario.get_stand_size()
    geometry = scenario.planning_area.geometry

    stands = Stand.objects.within_polygon(geometry, stand_size).with_webmercator()

    try:
        with rasterio.Env(get_storage_session()):
            query = {"modules": {"forsys": {"legacy_name": datalayer_name}}}
            datalayer = DataLayer.objects.get(
                type=DataLayerType.RASTER,
                metadata__contains=query,
            )
            if feature_enabled("PAGINATED_STAND_METRICS"):
                paginator = Paginator(stands, settings.STAND_METRICS_PAGE_SIZE)
                for page in paginator.page_range:
                    paginated_stands = paginator.page(page)
                    log.info(f"Processing page {page} of stands")

                    calculate_stand_zonal_stats(paginated_stands.object_list, datalayer)
            else:
                calculate_stand_zonal_stats(stands, datalayer)
    except DataLayer.DoesNotExist:
        log.warning(f"DataLayer with name {datalayer_name} does not exist.")
        return


@app.task(max_retries=3, retry_backoff=True)
def async_calculate_stand_metrics_v2(scenario_id: int, datalayer_id: int) -> None:
    scenario = Scenario.objects.get(id=scenario_id)
    stand_size = scenario.get_stand_size()
    geometry = scenario.planning_area.geometry

    stands = Stand.objects.within_polygon(geometry, stand_size).with_webmercator()

    try:
        with rasterio.Env(get_storage_session()):
            datalayer = DataLayer.objects.get(
                pk=datalayer_id,
            )
            if feature_enabled("PAGINATED_STAND_METRICS"):
                paginator = Paginator(stands, settings.STAND_METRICS_PAGE_SIZE)
                for page in paginator.page_range:
                    paginated_stands = paginator.page(page)
                    log.info(f"Processing page {page} of stands")

                    calculate_stand_zonal_stats(paginated_stands.object_list, datalayer)
            else:
                calculate_stand_zonal_stats(stands, datalayer)
    except DataLayer.DoesNotExist:
        log.warning(f"DataLayer with id {datalayer_id} does not exist.")
        return


@app.task(max_retries=3, retry_backoff=True)
def async_pre_forsys_process(scenario_id: int) -> None:
    scenario = Scenario.objects.get(id=scenario_id)

    tx_goal = scenario.treatment_goal
    if not tx_goal:
        log.warning(
            f"Scenario {scenario_id} does not have an associated TreatmentGoal."
        )
        return

    stand_ids = Stand.objects.within_polygon(
        scenario.planning_area.geometry,
        scenario.get_stand_size(),
    ).values_list("id", flat=True)

    datalayers = {
        datalayer.id: {
            "metric": get_datalayer_metric(datalayer),
            "thresholds": get_datalayer_thresholds(datalayer, tx_goal),
            "name": datalayer.name,
        }
        for datalayer in tx_goal.datalayers.all()
    }

    min_area_project = get_min_project_area(scenario)
    max_area_project = get_max_treatable_area(scenario.configuration)
    number_of_projects = scenario.configuration.get(
        "max_project_count", settings.DEFAULT_MAX_PROJECT_COUNT
    )
    sdw = settings.FORSYS_SDW
    epw = settings.FORSYS_EPW
    exclusion_limit = settings.FORSYS_EXCLUSION_LIMIT
    sample_fraction = settings.FORSYS_SAMPLE_FRACTION
    seed = scenario.configuration.get("seed")

    forsys_input = {
        "stand_ids": list(stand_ids),
        "datalayers": datalayers,
        "variables": {
            "min_area_project": min_area_project,
            "max_area_project": max_area_project,
            "number_of_projects": number_of_projects,
            "spatial_distribution_weight": sdw,
            "edge_proximity_weight": epw,
            "exclusion_limit": exclusion_limit,
            "sample_fraction": sample_fraction,
            "seed": seed,
        },
    }

    with transaction.atomic():
        scenario = Scenario.objects.select_for_update().get(id=scenario_id)
        scenario.forsys_input = forsys_input  # type: ignore
        scenario.save(update_fields=["forsys_input", "updated_at"])


@app.task(max_retries=10, retry_backoff=True, default_retry_delay=120)
def async_generate_scenario_geopackage(scenario_id: int) -> None:
    from planning.services import export_to_geopackage

    """
    This function is a placeholder for the actual implementation of generating
    a scenario geopackage. It should be implemented in the future.
    """
    log.info(f"Generating geopackage for scenario {scenario_id}")
    scenario = Scenario.objects.get(id=scenario_id)
    if scenario.result_status != ScenarioResultStatus.SUCCESS:
        log.warning(
            f"Scenario {scenario_id} is not in a successful state. Current status: {scenario.result_status}"
        )
        raise ValueError(
            f"Scenario {scenario_id} is not ready for geopackage generation."
        )

    geopackage_path = export_to_geopackage(scenario)
    log.info(f"Geopackage generated at {geopackage_path}")
