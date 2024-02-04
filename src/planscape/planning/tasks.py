from subprocess import CalledProcessError, TimeoutExpired
from planscape.celery import app
from planning.models import Scenario, ScenarioResultStatus, ScenarioResult
import logging

from utils.cli_utils import call_forsys

log = logging.getLogger(__name__)


@app.task(max_retries=3, retry_backoff=True)
def async_forsys_run(scenario_id: int) -> int:
    try:
        scenario = Scenario.objects.get(id=scenario_id)
    except Scenario.DoesNotExist:
        log.warning(f"Scenario with {scenario_id} does not exists.")

    try:
        log.info(f"Running scenario {scenario_id}")
        call_forsys(scenario.pk)
        sr = ScenarioResult.objects.get(scenario_id=scenario_id)
        return sr.status

    except TimeoutExpired:
        # this case should not happen as is, as the default parameter
        # for call_forsys timeout is None.
        scenario.results.status = ScenarioResultStatus.TIMED_OUT
        scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"Running forsys for scenario {scenario_id} timed-out. Might be too big."
        )
    except CalledProcessError:
        scenario.results.status = ScenarioResultStatus.PANIC
        scenario.results.save()
        # this error WILL be reported by default to Sentry
        log.error(
            f"A panic error happened while trying to call forsys for {scenario_id}"
        )
