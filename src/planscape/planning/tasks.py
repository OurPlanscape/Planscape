from subprocess import CalledProcessError, TimeoutExpired
from planning.models import Scenario, ScenarioResultStatus
import logging
from utils.cli_utils import call_forsys
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task(max_retries=3, retry_backoff=True)
def async_forsys_run(scenario_id: int) -> None:
    log.debug("Calling async_forsys_run for scenario {scenario_id}")
    try:
        scenario = Scenario.objects.get(id=scenario_id)
        log.info(f"Scenario {scenario_id} has status {scenario.result_status}")
    except Scenario.DoesNotExist:
        log.warning(f"Scenario of {scenario_id} does not exist.")
    try:
        log.info(f"Saving scenario {scenario_id}")
        if (
            scenario.result_status == None
            or scenario.result_status == ScenarioResultStatus.PENDING
        ):
            scenario.result_status = ScenarioResultStatus.RUNNING
            print(f"Calling forsys for {scenario_id}")
            forsys_result = call_forsys(scenario.pk)
            print(f"Are we getting a forsys_result? {forsys_result}")
            if forsys_result.returncode == 0:
                print(f"forsys result for scenario {scenario_id} was successful")
                scenario.result_status = ScenarioResultStatus.SUCCESS
                scenario.save()
            else:
                print(
                    f"Forsys result for scenario {scenario_id} was not successful: {forsys_result.returncode}"
                )

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
