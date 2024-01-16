import math
import os
from datetime import date, time, datetime
from pathlib import Path
from typing import Any, Dict, Tuple
import zipfile
from django.conf import settings
import fiona
from fiona.crs import from_epsg
from django.contrib.gis.geos import GEOSGeometry
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


def get_acreage(geometry: GEOSGeometry):
    CONVERSION_SQM_ACRES = 4046.8564213562374
    epsg_5070_area = geometry.transform(5070, clone=True).area
    acres = epsg_5070_area / CONVERSION_SQM_ACRES
    return acres


def validate_scenario_treatment_ratio(
    planning_area: PlanningArea,
    configuration: Dict[str, Any],
) -> Tuple[bool, str]:
    planning_area_acres = get_acreage(planning_area.geometry)
    max_treatable_area = get_max_treatable_area(configuration)

    min_acreage = math.floor(planning_area_acres * 0.2)
    max_acreage = math.ceil(planning_area_acres * 0.8)

    if max_treatable_area <= min_acreage:
        return (
            False,
            f"Treatment area is {round(max_treatable_area, 2)} acres. This should be at least {min_acreage} acres, or 20% of {int(planning_area_acres)} acres.",
        )

    if max_treatable_area >= max_acreage:
        return (
            False,
            f"Treatment area is {round(max_treatable_area, 2)} acres. This should be less than {max_acreage} acres, or 80% of {int(planning_area_acres)} acres.",
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
    crs = from_epsg(4326)
    with fiona.open(
        str(shapefile_path),
        "w",
        crs=crs,
        driver="ESRI Shapefile",
        schema=schema,
    ) as c:
        for feature in geojson.get("features", []):
            c.write(feature)

    return shapefile_folder
