from planscape.celery import app


@app.task(max_retries=3)
def async_forsys_run(scenario_id: int) -> None:
    pass
