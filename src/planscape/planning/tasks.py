from subprocess import CalledProcessError, TimeoutExpired
from planscape.celery import app
from planning.models import Scenario, ScenarioResultStatus
import logging

from utils.cli_utils import call_forsys

log = logging.getLogger(__name__)


@app.task
def review_results(sid):
    try:
        scenario = Scenario.objects.get(id=sid)
        res = scenario.results.status
        print(f"Status is: {res}")
        return res
    except Exception:
        log.error(f"Could not get a scenario result for: {sid}")


@app.task(max_retries=3, retry_backoff=True)
def async_forsys_run(scenario_id: int) -> None:
    try:
        scenario = Scenario.objects.get(id=scenario_id)
    except Scenario.DoesNotExist:
        log.warning(f"Scenario with {scenario_id} does not exist.")
        raise Exception("Scenario with id: {scenario_id} does not exist.")

    try:
        log.info(f"Running scenario {scenario_id}")
        # call_forsys(scenario.pk)
        return

    except TimeoutExpired as e:
        # this case should not happen as is, as the default parameter
        # for call_forsys timeout is None.
        scenario.results.status = ScenarioResultStatus.TIMED_OUT
        scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"Running forsys for scenario {scenario_id} timed-out. Might be too big."
        )
        raise TimeoutExpired(e.cmd, e.timeout) from e
    except CalledProcessError as cpe:
        scenario.results.status = ScenarioResultStatus.PANIC
        scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"A panic error happened while trying to call forsys for {scenario_id}"
        )
        raise CalledProcessError(e.cmd, e.timeout) from cpe
