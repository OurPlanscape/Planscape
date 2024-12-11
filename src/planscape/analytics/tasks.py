import logging
import requests
import json
from typing import Dict, AnyStr, Any
from django.conf import settings
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task()
def async_collect_metric(event_name: AnyStr, event_params: Dict[str, Any]) -> None:
    """ """
    if not all(
        (
            settings.FIREBASE_APP_ID,
            settings.FIREBASE_APP_INSTANCE_ID,
            settings.FIREBASE_API_SECRET,
        )
    ):
        log.warning("Firebase not configured.")
        return

    url = (
        "https://www.google-analytics.com/mp/collect?"
        f"firebase_app_id={settings.FIREBASE_APP_ID}"
        f"&api_secret={settings.FIREBASE_API_SECRET}"
    )
    payload = {
        "app_instance_id": settings.FIREBASE_APP_INSTANCE_ID,
        "non_personalized_ads": False,
        "events": [{"name": event_name, "params": event_params}],
    }
    r = requests.post(url, data=json.dumps(payload), verify=True)

    log.debug(f"Event <{event_name}> collect returned {r.status_code}")
