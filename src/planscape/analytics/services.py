from typing import Dict, AnyStr, Any

from analytics.tasks import async_collect_metric


def collect_metric(event_name: AnyStr, event_params: Dict[str, Any]) -> None:
    async_collect_metric.delay(event_name, event_params)
