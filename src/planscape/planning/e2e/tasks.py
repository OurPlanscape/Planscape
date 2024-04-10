import logging
import json
import sentry_sdk

from celery import shared_task

from planning.models import Scenario
from planscape.celery import app
from planning.e2e.validation import validation_results

log = logging.getLogger(__name__)


@app.task(retry_backoff=False)
def review_results(sid, validation_schema) -> object:
    try:
        scenario = Scenario.objects.get(id=sid)
        res = scenario.results.result
        if scenario.results.status != "SUCCESS":
            error_message = (
                f"Forsys FAILED to process scenario: {scenario.id} {scenario.name}"
            )
            print(error_message)
            sentry_sdk.capture_message(error_message)
            return json.dumps(
                {
                    "result": "FAILED",
                    "scenario_id": sid,
                    "details": f"Forsys failed for {scenario.name}",
                }
            )
        return validation_results(sid, validation_schema, res)
    except Exception as e:
        log.error("ERROR: Could not get a scenario result for scenario id %s", sid)
        raise Exception from e
