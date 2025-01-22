import rasterio

from core.s3 import get_aws_session
from subprocess import CalledProcessError, TimeoutExpired
from datasets.models import DataLayer, DataLayerType
from planning.models import Scenario, ScenarioResultStatus
from stands.models import Stand
from stands.services import calculate_stand_zonal_stats
from rasterio.session import AWSSession
import logging
from utils.cli_utils import call_forsys
from planscape.celery import app

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

        scenario.result_status = ScenarioResultStatus.SUCCESS
        scenario.save()
    except TimeoutExpired:
        # this case should not happen as is, as the default parameter
        # for call_forsys timeout is None.
        scenario.result_status = ScenarioResultStatus.TIMED_OUT
        scenario.save()
        scenario.results.status = ScenarioResultStatus.TIMED_OUT
        scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"Running forsys for scenario {scenario_id} timed-out. Might be too big."
        )
    except CalledProcessError:
        scenario.result_status = ScenarioResultStatus.PANIC
        scenario.save()
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

    aws_session = AWSSession(get_aws_session())
    with rasterio.Env(aws_session):
        query = {"modules": {"forsys": {"legacy_name": datalayer_name}}}
        datalayer = DataLayer.objects.get(
            type=DataLayerType.RASTER,
            metadata__contains=query,
        )
        calculate_stand_zonal_stats(stands, datalayer)
