from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

from impacts.models import TreatmentResultDisplayType


def get_display_type(
    value: Optional[float], baseline: Optional[float]
) -> TreatmentResultDisplayType:
    match (value, baseline):
        case None, None:
            return TreatmentResultDisplayType.NON_BURNABLE
        case _, None:
            return TreatmentResultDisplayType.NON_FORESTED
        case None, _:
            return TreatmentResultDisplayType.NON_FORESTED
        case 0, _:
            return TreatmentResultDisplayType.NON_FORESTED
        case _, 0:
            return TreatmentResultDisplayType.NON_FORESTED
        case _:
            return TreatmentResultDisplayType.FORESTED


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


def truncate_result(value: float, quantize=".01") -> float:
    return float(Decimal(value).quantize(Decimal(quantize), rounding=ROUND_HALF_UP))
