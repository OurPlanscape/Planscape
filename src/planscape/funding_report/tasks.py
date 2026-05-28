import time

from planscape.celery import app


@app.task()
def run_funding_opportunity_report(funding_opportunity_report_id: int) -> None:
    time.sleep(60)
