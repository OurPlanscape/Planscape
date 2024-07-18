import logging
import math
import os
import zipfile
import fiona
from datetime import date, time, datetime
from pathlib import Path
from typing import Any, Dict, Tuple, Type
from django.conf import settings
from django.db import transaction
from fiona.crs import from_epsg
from django.contrib.gis.geos import GEOSGeometry
from collaboration.permissions import PlanningAreaPermission, ScenarioPermission
from planning.geometry import coerce_geojson
from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioResult,
    ScenarioResultStatus,
    ScenarioStatus,
)
from planning.tasks import async_forsys_run
from stands.models import StandSizeChoices, area_from_size
from utils.geometry import to_multi
from django.contrib.auth.models import AbstractUser
from actstream import action

logger = logging.getLogger(__name__)
UserType = Type[AbstractUser]


@transaction.atomic()
def create_planning_area(
    user: UserType,
    name: str,
    region_name: str,
    geojson: Dict[str, Any],
    notes: str = None,
) -> PlanningArea:
    """Canonical method to create a new planning area."""
    geometry = coerce_geojson(geojson)
    planning_area = PlanningArea.objects.create(
        user=user,
        name=name,
        region_name=region_name,
        geometry=geometry,
        notes=notes,
    )
    action.send(user, verb="created", action_object=planning_area)
    return planning_area


@transaction.atomic
def delete_planning_area(
    user: UserType,
    planning_area: Type[PlanningArea],
):
    if not PlanningAreaPermission.can_remove(user, planning_area):
        logger.error(f"User {user} has no permission to delete {planning_area.pk}")
        return (
            False,
            f"User does not have permission to delete planning area {planning_area.pk}.",
        )

    action.send(user, verb="deleted", action_object=planning_area)
    planning_area.delete()
    return (True, "deleted")


@transaction.atomic()
def create_scenario(user: UserType, **kwargs) -> Scenario:
    data = {
        "user": user,
        "result_status": ScenarioResultStatus.PENDING,
        **kwargs,
    }
    scenario = Scenario.objects.create(**data)
<<<<<<< HEAD
    ScenarioResult.objects.create(scenario=scenario)
=======

>>>>>>> d5f6d2e5 (hotfix race condition forsys)
    # george created scenario 1234 on planning area XYZ
    action.send(
        user,
        verb="created",
        action_object=scenario,
        target=scenario.planning_area,
    )
    async_forsys_run.delay(scenario.pk)
    return scenario


@transaction.atomic
def delete_scenario(
    user: UserType,
    scenario: Type[Scenario],
):
    if not ScenarioPermission.can_delete(user, scenario):
        logger.error(f"User {user} has no permission to delete {scenario.pk}")
        return (
            False,
            f"User does not have permission to delete planning area {scenario.pk}.",
        )

    # george deleted scenario 12345 on planning area XYZ
    action.send(
        user,
        verb="deleted",
        action_object=scenario,
        target=scenario.planning_area,
    )
    scenario.delete()
    return (True, "deleted")


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
    epsg_5070_area = geometry.transform(settings.AREA_SRID, clone=True).area
    acres = epsg_5070_area / settings.CONVERSION_SQM_ACRES
    return acres


def validate_scenario_treatment_ratio(
    planning_area: PlanningArea,
    configuration: Dict[str, Any],
) -> Tuple[bool, str]:
    planning_area_acres = get_acreage(planning_area.geometry)
    max_treatable_area = get_max_treatable_area(configuration)

    min_acreage = math.floor(planning_area_acres * 0.2)
    max_acreage = math.ceil(planning_area_acres * 0.8)

    # the user has not provided a budget
    if "max_budget" not in configuration:
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

    # the user has provided a budget, but the budget isn't sufficient to treat > 20% of the area
    if "max_budget" in configuration and max_treatable_area <= min_acreage:
        min_req_budget = math.ceil(min_acreage * configuration["est_cost"])
        return (
            False,
            f"Your budget can only treat {math.floor(max_treatable_area)} acres. It should be at least ${min_req_budget} to treat 20% of the planning area.",
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
        "geometry": first.get("geometry", {}).get("type", "MultiPolygon")
        or "MultiPolygon",
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
            geometry = to_multi(feature.get("geometry"))
            feature = {**feature, "geometry": geometry}
            c.write(feature)

    return shapefile_folder


@transaction.atomic()
def toggle_scenario_status(scenario: Scenario, user: UserType) -> Scenario:
    new_status = (
        ScenarioStatus.ACTIVE
        if scenario.status == ScenarioStatus.ARCHIVED
        else ScenarioStatus.ARCHIVED
    )
    verb = "activated" if scenario.status == ScenarioStatus.ARCHIVED else "archived"
    scenario.status = new_status
    scenario.save()
    action.send(user, verb=verb, action_object=scenario)
    return scenario
