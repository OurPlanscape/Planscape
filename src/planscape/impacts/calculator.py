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


def truncate_result(value: float, quantize=".01") -> float:
    return float(Decimal(value).quantize(Decimal(quantize), rounding=ROUND_HALF_UP))
