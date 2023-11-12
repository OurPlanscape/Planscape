import math
import os
from datetime import date, time, datetime
from pathlib import Path
from typing import Any, Dict, Tuple
import zipfile
from django.conf import settings
import fiona

from planning.models import PlanningArea, Scenario, ScenarioResultStatus
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
    stands = Stand.objects.overlapping(
        planning_area.geometry,
        configuration.get("stand_size"),
    )
    stand_count = stands.count()
    ratio = max_treatable_stands / stand_count

    if ratio <= 0.2:
        return (False, "Too few treatable stands for the selected area and stand size.")

    if ratio >= 0.8:
        return (
            False,
            "Too many treatable stands for the selected area and stand size.",
        )

    return (True, "Treatment ratio is valid.")


def map_property(key_value_pair):
    key, value = key_value_pair
    type = ""
    match value:
        case int() as v:
            type = "int"
        case str() as v:
            type = "str:128"
        case float() as v:
            type = "float"
        case datetime() as v:
            type = "str:64"
        case date() as v:
            type = "date"
        case time() as v:
            type = "time"
    return (key, type)


def get_schema(geojson: Dict[str, Any]) -> Dict[str, Any]:
    features = geojson.get("features", [])
    first = features[0]
    field_type_pairs = list(map(map_property, first.get("properties", {}).items()))
    schema = {
        "geometry": first.get("geometry", {}).get("type", "Polygon") or "Polygon",
        "properties": field_type_pairs,
    }
    return schema


def export_to_shapefile(scenario: Scenario) -> Path:
    """Given a scenario, export it to shapefile
    and return the path of the folder containing all files.
    """

    if scenario.results.status != ScenarioResultStatus.SUCCESS:
        raise ValueError("Cannot export a scenario if it's result failed.")
    geojson = scenario.results.result
    schema = get_schema(geojson)
    shapefile_folder = scenario.get_shapefile_folder()
    shapefile_file = f"{scenario.name}.shp"
    shapefile_path = shapefile_folder / shapefile_file
    if not shapefile_folder.exists():
        shapefile_folder.mkdir(parents=True)
    with fiona.open(str(shapefile_path), "w", "ESRI Shapefile", schema) as c:
        for feature in geojson.get("features", []):
            c.write(feature)

    return shapefile_folder
