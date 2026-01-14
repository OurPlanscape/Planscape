import json
import logging
from typing import Any, Dict

import requests
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from planscape.celery import app

from core.flags import feature_enabled

log = logging.getLogger(__name__)


@app.task()
def track(payload: Dict[str, Any]) -> None:
    if not feature_enabled("OPENPANEL_INTEGRATION"):
        return
    url = f"{settings.OPENPANEL_URL}/track"
    headers = {
        "openpanel-client-id": settings.OPENPANEL_CLIENT_ID,
        "openpanel-client-secret": settings.OPENPANEL_CLIENT_SECRET,
    }
    data = json.dumps(payload, cls=DjangoJSONEncoder)
    response = requests.post(url, data=data, headers=headers)
    if response.status_code not in (200, 202):
        log.error("Something went wrong while posting data to OpenPanel")
        return

    log.info("Event {event_name} tracked")
