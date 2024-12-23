import logging
import requests
import json
from typing import Dict, AnyStr, Any

from django.conf import settings
from django.utils.timezone import now
from planscape.celery import app

log = logging.getLogger(__name__)


def collect_metric(event_name: AnyStr, **kwargs) -> None:
    """
    Collects a metric and sends it to Firebase.
    :param event_name: The name of the event.
    :param kwargs: Set of key values of the event e.g. (success=True, execution_time=5).
    """
    if not settings.ANALYTICS_ENABLED:
        return

    for k, v in kwargs.items():
        if not type(k) == str or not type(v) in [str, int, bool, float]:
            log.warning("Unsuppoerted types of values.")
            return

    event_params = {**kwargs}

    _async_collect_metric.delay(event_name, int(now().timestamp()), event_params)


@app.task()
def _async_collect_metric(
    event_name: AnyStr, epoch_time: int, event_params: Dict[str, Any]
) -> None:
    """
    Asynchronous task to collect a metric and send it to Firebase.
    :param event_name: The name of the event.
    :param epoch_time: The time the event occurred.
    :param event_params: Set of key values of the event e.g. ({success=True, execution_time=5}).
    """
    if not all(
        (
            settings.FIREBASE_APP_ID,
            settings.FIREBASE_APP_INSTANCE_ID,
            settings.FIREBASE_API_SECRET,
        )
    ):
        log.warning("Firebase not configured.")
        return

    if settings.ANALYTICS_DEBUG_MODE:
        event_params.update({"debug_mode": settings.ANALYTICS_DEBUG_MODE})

    url = (
        "https://www.google-analytics.com/mp/collect?"
        f"firebase_app_id={settings.FIREBASE_APP_ID}"
        f"&api_secret={settings.FIREBASE_API_SECRET}"
    )
    payload = {
        "app_instance_id": settings.FIREBASE_APP_INSTANCE_ID,
        "timestamp_micros": epoch_time,
        "events": [{"name": event_name, "params": event_params}],
    }
    r = requests.post(url, json=json.dumps(payload), verify=True)

    log.debug(f"Event <{event_name}> collect returned {r.status_code}")
