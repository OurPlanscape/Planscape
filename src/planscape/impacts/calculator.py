from typing import Optional


def calculate_delta(
    value: Optional[float], baseline: Optional[float]
) -> Optional[float]:
    if value is None and baseline is None:
        # non-burnable stand
        return None

    if baseline is None:
        # non-forested stand
        return 0

    if value == 0 or baseline == 0:
        # non-forested
        return 0

    return (value - baseline) / baseline  # type: ignore
