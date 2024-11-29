from typing import Optional


def calculate_delta(
    value: Optional[float], baseline: Optional[float]
) -> Optional[float]:
    if not value and not baseline:
        return None
    value = value if value else 0
    baseline = baseline if baseline else 1
    return (value - baseline) / baseline
