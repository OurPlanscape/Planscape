import logging
import requests
import json
from typing import Dict, AnyStr, Any

from django.conf import settings
from django.utils.timezone import now
from planscape.celery import app
from pyga.requests import Tracker
from pyga.entities import Event, Session, Visitor

log = logging.getLogger(__name__)


def track_metric(event_name: AnyStr, **kwargs) -> None:
    """
    Tracks metrics and sends them to Google Analytics.
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

    _async_track_metric.delay(event_name, int(now().timestamp()), event_params)


@app.task()
def _async_track_metric(
    event_name: AnyStr, epoch_time: int, event_params: Dict[str, Any]
) -> None:
    """
    Asynchronous task to track metrics and send them to Google Analytics.
    :param event_name: The name of the event.
    :param epoch_time: The time the event occurred.
    :param event_params: Set of key values of the event e.g. ({success=True, execution_time=5}).
    """
    if not all((settings.GA_TRACKING_ID, settings.GA_CLIENT_ID)):
        log.warning("Google Analytics not configured.")
        return

    event_params["time"] = epoch_time

    tracker = Tracker(settings.GA_TRACKING_ID, settings.GA_CLIENT_ID)

    event = Event(
        category="Metric",
        action=event_name,
        label="Event",
        value=event_params,
    )

    tracker.track_event(
        event=event,
        session=Session(),
        visitor=Visitor(),
    )

    log.debug(f"Event <{event_name}> collected")
