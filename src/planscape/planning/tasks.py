import logging

import rasterio
from core.flags import feature_enabled
from datasets.models import DataLayer, DataLayerType
from django.conf import settings
from django.core.paginator import Paginator
from gis.core import get_storage_session
from stands.models import Stand, StandSizeChoices
from stands.services import (
    calculate_stand_vector_stats,
    calculate_stand_zonal_stats,
    create_stands_for_geometry,
)
from utils.cli_utils import call_forsys

from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioResultStatus,
    GeoPackageStatus,
)
from planscape.celery import app
from planscape.exceptions import ForsysException, ForsysTimeoutException

log = logging.getLogger(__name__)


@app.task()
def async_create_stands(planning_area_id: int) -> None:
    try:
        planning_area = PlanningArea.objects.get(id=planning_area_id)
    except PlanningArea.DoesNotExist:
        log.warning(f"Planning Area with {planning_area_id} does not exist.")
        raise
    for i in StandSizeChoices:
        log.info(f"Creating stands for {planning_area_id} for stand size {i}")
        create_stands_for_geometry(planning_area.geometry, i)


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
        call_forsys(scenario.pk)

        if not feature_enabled("FORSYS_VIA_API"):
            scenario.result_status = ScenarioResultStatus.SUCCESS
        scenario.save()
        async_generate_scenario_geopackage.apply_async(
            args=(scenario.pk,),
            countdown=30 if feature_enabled("FORSYS_VIA_API") else 0,
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


@app.task()
def async_calculate_vector_metrics(planning_area_id: int, datalayer_id: int) -> None:
    planning_area = PlanningArea.objects.get(id=planning_area_id)
    datalayer = DataLayer.objects.get(id=datalayer_id)
    for i in StandSizeChoices:
        stands = planning_area.get_stands(i)
        calculate_stand_vector_stats(stands=stands, datalayer=datalayer)


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


@app.task()
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
        return

    if scenario.geopackage_status != GeoPackageStatus.PENDING:
        log.warning(
            f"Geopackage status for scenario {scenario_id} is {scenario.geopackage_status}. Will not generate geopackage."
        )
        return

    geopackage_path = export_to_geopackage(scenario)
    log.info(f"Geopackage generated at {geopackage_path}")
