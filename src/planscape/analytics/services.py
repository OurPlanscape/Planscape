from typing import AnyStr

from django.conf import settings
from django.utils.timezone import now

from analytics.tasks import async_collect_metric


def collect_metric(event_name: AnyStr, **kwargs) -> None:
    if not settings.ANALYTICS_ENABLED:
        return
    
    event_params = {
        "timestamp": now(),
        **kwargs
    }
    if settings.ANALYTICS_DEBUG_MODE:
        event_params.update({"debug_mode": True})
        
    async_collect_metric.delay(event_name, event_params)
