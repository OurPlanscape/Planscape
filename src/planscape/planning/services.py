import math
import os
from typing import Any, Dict, Tuple
import zipfile
from django.conf import settings

from planning.models import PlanningArea, Scenario
from stands.models import Stand, StandSizeChoices, area_from_size


def zip_directory(file_obj, source_dir):
    with zipfile.ZipFile(file_obj, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_dir):
            for file in files:
                zipf.write(
                    os.path.join(root, file),
                    os.path.relpath(
                        os.path.join(root, file), os.path.join(source_dir, "..")
                    ),
                )


def get_max_treatable_area(configuration: Dict[str, Any]) -> float:
    max_budget = configuration.get("max_budget") or None
    cost_per_acre = configuration.get("est_cost") or settings.DEFAULT_EST_COST_PER_ACRE
    if max_budget:
        return max_budget / cost_per_acre

    return float(configuration.get("max_treatment_area_ratio"))


def get_max_treatable_stand_count(
    max_treatable_area: float,
    stand_size: StandSizeChoices,
) -> int:
    stand_area = area_from_size(stand_size)
    return math.floor(max_treatable_area / stand_area)


def validate_scenario_treatment_ratio(
    planning_area: PlanningArea,
    configuration: Dict[str, Any],
) -> Tuple[bool, str]:
    max_treatable_area = get_max_treatable_area(configuration)
    max_treatable_stands = get_max_treatable_stand_count(
        max_treatable_area,
        configuration.get("stand_size"),
    )
    stands = Stand.objects.overlapping(planning_area.geometry)
    stand_count = stands.count()

    ratio = max_treatable_stands / stand_count

    if ratio <= 0.2:
        return (False, "Too few treatable stands for the selected area and stand size.")

    if ratio >= 0.8:
        return (
            False,
            "Too many treatable stands for the selected area and stand size.",
        )

    return (True, "all good")
