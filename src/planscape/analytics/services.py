from typing import AnyStr
from django.utils.timezone import now

from analytics.tasks import async_collect_metric


def collect_metric(event_name: AnyStr, **kwargs) -> None:
    event_params = {
        "timestamp": now(),
        **kwargs
    }
    async_collect_metric.delay(event_name, event_params)
