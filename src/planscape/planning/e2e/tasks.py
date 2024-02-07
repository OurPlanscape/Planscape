import logging
from celery import shared_task

from planning.models import Scenario
from planscape.celery import app
from planning.e2e.validation import validation_results

log = logging.getLogger(__name__)


@app.task(max_retries=3, retry_backoff=True)
def review_results(sid, validation_schema) -> object:
    try:
        scenario = Scenario.objects.get(id=sid)
        res = scenario.results.result
        return validation_results(sid, validation_schema, res)
    except Exception as e:
        log.error("ERROR: Could not get a scenario result for scenario id %s", sid)
        raise Exception from e
