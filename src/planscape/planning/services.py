import json
import logging
import math
import os
import zipfile
import fiona

from datetime import date, time, datetime
from functools import partial
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Type, Union
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.db import transaction
from django.utils.timezone import now
from fiona.crs import from_epsg
from collaboration.permissions import PlanningAreaPermission, ScenarioPermission
from planscape.typing import TLooseGeom, TUser
from planning.geometry import coerce_geojson
from planning.models import (
    PlanningArea,
    ProjectArea,
    ProjectAreaNote,
    Scenario,
    ScenarioOrigin,
    ScenarioResult,
    ScenarioResultStatus,
    ScenarioStatus,
)
from planning.tasks import async_forsys_run
from planscape.exceptions import InvalidGeometry
from stands.models import StandSizeChoices, area_from_size
from utils.geometry import to_multi
from actstream import action

logger = logging.getLogger(__name__)


@transaction.atomic()
def create_planning_area(
    user: TUser,
    name: str,
    region_name: str,
    geometry: TLooseGeom = None,
    notes: Optional[str] = None,
) -> PlanningArea:
    """Canonical method to create a new planning area."""

    # FIXME: this code path is temporary. once we migrate to v2
    # we can deprecate the `LooseGeomType` because serializers
    # will take care of the conversion correctly
    if not isinstance(geometry, GEOSGeometry):
        geometry = coerce_geojson(geometry)

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
    user: TUser,
    planning_area: PlanningArea,
):
    if not PlanningAreaPermission.can_remove(user, planning_area):
        logger.error(f"User {user} has no permission to delete {planning_area.pk}")
        return (
            False,
            f"User does not have permission to delete planning area {planning_area.pk}.",
        )

    right_now = now()
    action.send(user, verb="deleted", action_object=planning_area)
    planning_area.delete()
    Scenario.objects.filter(planning_area__pk=planning_area.pk).update(
        deleted_at=right_now
    )
    ScenarioResult.objects.filter(scenario__planning_area__pk=planning_area.pk).update(
        deleted_at=right_now
    )
    ProjectArea.objects.filter(scenario__planning_area__pk=planning_area.pk).update(
        deleted_at=right_now
    )
    return (True, "deleted")


@transaction.atomic()
def create_scenario(user: TUser, **kwargs) -> Scenario:
    # precedence here to the `kwargs`. if you supply `origin` here
    # your origin will be used instead of this default one.
    data = {
        "user": user,
        "origin": ScenarioOrigin.SYSTEM,
        "result_status": ScenarioResultStatus.PENDING,
        **kwargs,
    }
    scenario = Scenario.objects.create(**data)
    ScenarioResult.objects.create(scenario=scenario)
    # george created scenario 1234 on planning area XYZ
    action.send(
        user,
        verb="created",
        action_object=scenario,
        target=scenario.planning_area,
    )
    async_forsys_run.delay(scenario.pk)
    return scenario


def union_geojson(uploaded_geojson) -> GEOSGeometry:
    geometries = []
    if "features" in uploaded_geojson:
        for feature in uploaded_geojson["features"]:
            try:
                geom = GEOSGeometry(json.dumps(feature["geometry"]), srid=4326)
                if isinstance(geom, (Polygon, MultiPolygon)):
                    geometries.append(geom)
            except Exception as e:
                print(f"Error processing feature: {e}")
    else:
        geometries.append(GEOSGeometry(json.dumps(uploaded_geojson), srid=4326))
    if not geometries:
        raise ValueError("No valid polygon geometries found")
    unioned_geometry = geometries[0]
    for geom in geometries[1:]:
        unioned_geometry = unioned_geometry.union(geom)

    return unioned_geometry


def feature_to_project_area(user_id: int, scenario, feature, idx: Optional[int] = None):
    try:
        area_name = f"{scenario.name}, Project Area"
        if idx is not None:
            area_name += f" {idx}"

        project_area = {
            "geometry": MultiPolygon(
                [
                    GEOSGeometry(feature, srid=4326).transform(
                        settings.CRS_INTERNAL_REPRESENTATION, clone=True
                    )
                ]
            ),
            "name": area_name,
            "created_by": user_id,
            "scenario": scenario,
        }
        proj_area_obj = ProjectArea.objects.create(**project_area)

        action.send(
            user_id,
            verb="created",
            action_object=proj_area_obj,
            target=scenario,
        )

        return proj_area_obj

    except Exception as e:
        logger.error(f"Unable to create project area for {scenario.name} {e}")
        raise e


@transaction.atomic()
def create_scenario_from_upload(validated_data, user) -> Scenario:
    planning_area = PlanningArea.objects.get(pk=validated_data["planning_area"])
    uploaded_geom = validated_data["geometry"]

    scenario = Scenario.objects.create(
        name=validated_data["name"],
        planning_area=planning_area,
        user=user,
        configuration={"stand_size": validated_data["stand_size"]},
        origin=ScenarioOrigin.USER,
    )
    transaction.on_commit(
        partial(
            action.send,
            sender=scenario.user,
            verb="created",
            action_object=scenario,
            target=scenario.planning_area,
        )
    )
    # Create project areas from features...
    # handle just one polygon
    if "type" in uploaded_geom and uploaded_geom["type"] == "Polygon":
        new_feature = feature_to_project_area(
            scenario.user, scenario, json.dumps(uploaded_geom)
        )
        uploaded_geom.setdefault("properties", {})
        uploaded_geom["properties"]["project_id"] = new_feature.pk

    # handle a FeatureCollection
    if "features" in uploaded_geom:
        for idx, f in enumerate(uploaded_geom["features"], 1):
            new_feature = feature_to_project_area(
                scenario.user, scenario, json.dumps(f["geometry"]), idx
            )
            f.setdefault("properties", {})
            f["properties"]["project_id"] = new_feature.pk

    # Store geometry with added properties into ScenarioResult.result
    ScenarioResult.objects.create(
        scenario=scenario, result=uploaded_geom, status="SUCCESS"
    )

    return scenario


@transaction.atomic
def delete_scenario(
    user: TUser,
    scenario: Type[Scenario],
):
    if not ScenarioPermission.can_remove(user, scenario):
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
    right_now = now()
    scenario.delete()
    ScenarioResult.objects.filter(scenario__pk=scenario.pk).update(deleted_at=right_now)
    ProjectArea.objects.filter(scenario__pk=scenario.pk).update(deleted_at=right_now)
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


def get_acreage(geometry: GEOSGeometry) -> float:
    try:
        epsg_5070_area = geometry.transform(settings.AREA_SRID, clone=True).area
        acres = epsg_5070_area / settings.CONVERSION_SQM_ACRES
        return acres
    except Exception:
        raise InvalidGeometry("Could not reproject geometry")


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
def toggle_scenario_status(scenario: Scenario, user: TUser) -> Scenario:
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


@transaction.atomic()
def create_projectarea_note(user: TUser, **kwargs) -> Scenario:
    data = {
        "user": user,
        **kwargs,
    }
    note = ProjectAreaNote.objects.create(**data)
    return note
