import logging

import rasterio
from gis.core import get_storage_session
from core.flags import feature_enabled
from datasets.models import DataLayer, DataLayerType
from stands.models import Stand
from stands.services import calculate_stand_zonal_stats
from utils.cli_utils import call_forsys

from planning.models import Scenario, ScenarioResultStatus
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

        call_forsys(scenario.pk)

        if not feature_enabled("FORSYS_VIA_API"):
            scenario.result_status = ScenarioResultStatus.SUCCESS
        scenario.save()
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
            calculate_stand_zonal_stats(stands, datalayer)
    except DataLayer.DoesNotExist:
        log.warning(f"DataLayer with name {datalayer_name} does not exist.")
        return
