from subprocess import CalledProcessError, TimeoutExpired
from planscape.celery import app
from planning.models import Scenario, ScenarioResultStatus
import logging
from jsonschema import Draft202012Validator, validate, ValidationError
from utils.cli_utils import call_forsys

log = logging.getLogger(__name__)


def validate_schema(validation_schema, output_result):
    print(f"Hello....are we here? we have result: {output_result}")
    print(f"And we want to compare it with validation_schema: {validation_schema}")

    print(f"do we have a type? {output_result['type']}")
    print(f"do we have a type? {validation_schema['type']}")

    try:
        schema_result = Draft202012Validator(validation_schema).is_valid(output_result)
        print(f"\n\Draft schema Result: {schema_result}")
        validate(output_result, {"maxItems": 2})
        return "idfk"
    except ValidationError as ve:
        print(f"Error in {ve}")


@app.task
def review_results(sid, schema):
    print(f"do we have a schema to compare?: {schema}")
    try:
        scenario = Scenario.objects.get(id=sid)
        res = scenario.results.result
        return validate_schema(schema, res)
    except Exception:
        log.error(f"Could not get a scenario result for: {sid}")
    # compare the result json with the JSON file that describes expected results


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
