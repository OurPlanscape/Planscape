from subprocess import CalledProcessError, TimeoutExpired
from planscape.celery import app
from planning.models import Scenario, ScenarioResultStatus
import logging
from sentry_sdk import capture_message
import sentry_sdk
import time
from utils.cli_utils import call_forsys

log = logging.getLogger(__name__)


@app.task(max_retries=3, retry_backoff=True)
def async_forsys_run(scenario_id: int) -> None:
    with sentry_sdk.push_scope() as scope:
        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist:
            log.warning(f"Scenario with {scenario_id} does not exists.")

        try:
            log.info(f"Running scenario {scenario_id}")
            start_time = time.time()

            capture_message("Forsys Task Started for Scenario", level="info")

            call_forsys(scenario.pk)
            end_time = time.time()
            duration = end_time - start_time
            sentry_sdk.set_measurement("forsys duration", duration, "seconds")
            capture_message("Forsys Task Ended for Scenario", level="info")

        except TimeoutExpired:
            # this case should not happen as is, as the default parameter
            # for call_forsys timeout is None.
            scenario.results.status = ScenarioResultStatus.TIMED_OUT
            scenario.results.save()
            # this error WILL be reported by default to Sentry
            end_time = time.time()
            duration = end_time - start_time
            capture_message("Forsys Task Timed-out", level="error")

            log.error(
                f"Running forsys for scenario {scenario_id} timed-out. Might be too big."
            )
        except CalledProcessError:
            scenario.results.status = ScenarioResultStatus.PANIC
            scenario.results.save()
            # this error WILL be reported by default to Sentry
            capture_message("Forsys Task failed to complete", level="error")
            log.error(
                f"A panic error happened while trying to call forsys for {scenario_id}"
            )
