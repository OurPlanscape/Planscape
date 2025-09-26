import csv
import json
import logging
import math
import os
import zipfile
from datetime import date, datetime, time
from functools import partial
from pathlib import Path
from typing import Any, Collection, Dict, List, Optional, Tuple, Type, Union

import fiona
from actstream import action
from celery import chord
from collaboration.permissions import PlanningAreaPermission, ScenarioPermission
from core.flags import feature_enabled
from core.gcs import upload_file_via_cli
from datasets.models import DataLayer, DataLayerType
from datasets.services import get_datalayer_by_module_atribute
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.gis.db.models.functions import Area, Transform
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.contrib.gis.measure import A
from django.db import transaction
from django.db.models.aggregates import Sum
from django.db.models.functions import Substr
from django.utils.timezone import now
from fiona.crs import from_epsg
from gis.info import get_gdal_env
from impacts.calculator import truncate_result
from modules.base import compute_scenario_capabilities
from pyproj import Geod
from shapely import wkt
from stands.models import Stand, StandSizeChoices, area_from_size
from stands.services import get_datalayer_metric, get_stand_grid_key_search_precision
from utils.geometry import to_multi

from planning.geometry import coerce_geojson, coerce_geometry
from planning.models import (
    GeoPackageStatus,
    PlanningArea,
    PlanningAreaMapStatus,
    ProjectArea,
    Scenario,
    ScenarioOrigin,
    ScenarioResult,
    ScenarioResultStatus,
    ScenarioStatus,
    TreatmentGoal,
    TreatmentGoalUsageType,
)
from planscape.exceptions import InvalidGeometry
from planscape.openpanel import track_openpanel

logger = logging.getLogger(__name__)


def create_metrics_task(
    planning_area: PlanningArea,
    datalayer: DataLayer,
    stand_size: StandSizeChoices,
    grid_key_start: str = "",
):
    from planning.tasks import (
        async_calculate_stand_metrics,
        async_calculate_vector_metrics,
    )

    match datalayer.type:
        case DataLayerType.VECTOR:
            return async_calculate_vector_metrics.si(
                planning_area.pk, datalayer.pk, stand_size, grid_key_start
            )
        case _:
            return async_calculate_stand_metrics.si(
                planning_area.pk, datalayer.pk, stand_size, grid_key_start
            )


def get_truncated_stands_grid_keys(
    planning_area: PlanningArea,
    stand_size: StandSizeChoices,
) -> List[str]:
    stands = planning_area.get_stands(stand_size=stand_size)
    precision = get_stand_grid_key_search_precision(stand_size)
    truncated_stand_grid_keys = (
        stands.annotate(trucated_hash=Substr("grid_key", 1, precision))
        .distinct("trucated_hash")
        .values_list("trucated_hash", flat=True)
    )
    return list(truncated_stand_grid_keys)


@transaction.atomic()
def create_planning_area(
    user: User,
    name: str,
    region_name: Optional[str] = None,
    geometry: Any = None,
    notes: Optional[str] = None,
) -> PlanningArea:
    from planning.tasks import async_create_stands, async_set_planning_area_status

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
        map_status=PlanningAreaMapStatus.PENDING,
    )
    slope = DataLayer.objects.all().by_meta_name("slope")
    distance_from_roads = DataLayer.objects.all().by_meta_name("distance_from_roads")
    datalayers = list(
        DataLayer.objects.all().by_meta_capability(
            TreatmentGoalUsageType.EXCLUSION_ZONE
        )
    ) + [
        slope,
        distance_from_roads,
    ]
    datalayers = list(filter(None, datalayers))

    create_stand_metrics_jobs = []

    for stand_size in StandSizeChoices:
        truncated_stand_grid_keys = get_truncated_stands_grid_keys(
            planning_area, stand_size
        )
        jobs = [
            create_metrics_task(planning_area, datalayer, stand_size, grid_key_start)
            for datalayer in datalayers
            for grid_key_start in truncated_stand_grid_keys
        ]
        create_stand_metrics_jobs.extend(jobs)

    set_map_status_done = async_set_planning_area_status.si(
        planning_area.pk,
        PlanningAreaMapStatus.DONE,
    )
    set_map_status_stands_done = async_set_planning_area_status.si(
        planning_area.pk,
        PlanningAreaMapStatus.STANDS_DONE,
    )
    create_stand_metrics_jobs = chord(
        header=create_stand_metrics_jobs, body=set_map_status_done
    )
    workflow = chord(
        header=[
            async_create_stands.si(planning_area.pk, StandSizeChoices.LARGE),
            async_create_stands.si(planning_area.pk, StandSizeChoices.MEDIUM),
            async_create_stands.si(planning_area.pk, StandSizeChoices.SMALL),
        ],
        body=create_stand_metrics_jobs,
    )
    track_openpanel(
        name="planning.planning_area.created",
        properties={
            "region": region_name,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )
    action.send(user, verb="created", action_object=planning_area)
    if feature_enabled("AUTO_CREATE_STANDS"):
        transaction.on_commit(lambda: workflow.apply_async())
    return planning_area


@transaction.atomic
def delete_planning_area(
    user: User,
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
    track_openpanel(
        name="planning.planning_area.deleted",
        properties={
            "soft": True,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )
    return (True, "deleted")


def get_treatment_goal_from_configuration(
    configuration: Dict[str, Any],
) -> Optional[TreatmentGoal]:
    """Get the treatment goal from the configuration."""
    question_id = configuration.get("question_id")
    if not question_id:
        return None

    try:
        treatment_goal = TreatmentGoal.objects.get(id=question_id)
    except TreatmentGoal.DoesNotExist:
        treatment_goal = None
        logger.warning(
            "Create-Scenario: Treatment goal with id %s does not exist.", question_id
        )
    return treatment_goal


@transaction.atomic()
def create_scenario(user: User, **kwargs) -> Scenario:
    from planning.tasks import (
        async_calculate_stand_metrics,
        async_forsys_run,
        async_pre_forsys_process,
    )

    # precedence here to the `kwargs`. if you supply `origin` here
    # your origin will be used instead of this default one.
    treatment_goal = kwargs.pop("treatment_goal", None)
    if not treatment_goal:
        treatment_goal = get_treatment_goal_from_configuration(
            kwargs.get("configuration", {})
        )
    data = {
        "user": user,
        "origin": ScenarioOrigin.SYSTEM,
        "result_status": ScenarioResultStatus.PENDING,
        "geopackage_status": GeoPackageStatus.PENDING,
        "treatment_goal": treatment_goal,
        **kwargs,
    }
    scenario = Scenario.objects.create(**data)
    scenario.capabilities = compute_scenario_capabilities(scenario)
    scenario.save(update_fields=["capabilities"])
    ScenarioResult.objects.create(scenario=scenario)
    # george created scenario 1234 on planning area XYZ
    action.send(
        user,
        verb="created",
        action_object=scenario,
        target=scenario.planning_area,
    )
    if not feature_enabled("SCENARIO_DRAFTS"):
        datalayers = treatment_goal.get_raster_datalayers()  # type: ignore
        truncated_stand_grid_keys = get_truncated_stands_grid_keys(
            scenario.planning_area, scenario.get_stand_size()
        )

        tasks = [
            async_calculate_stand_metrics.si(
                planning_area_id=scenario.planning_area.pk,
                datalayer_id=d.pk,
                stand_size=scenario.get_stand_size(),
                grid_key_start=grid_key_start,
            )
            for d in datalayers
            for grid_key_start in truncated_stand_grid_keys
        ]
        tasks.append(async_pre_forsys_process.si(scenario_id=scenario.pk))

        track_openpanel(
            name="planning.scenario.created",
            properties={
                "origin": scenario.origin,
                "treatment_goal_id": treatment_goal.pk if treatment_goal else None,
                "treatment_goal_category": (
                    treatment_goal.category if treatment_goal else None
                ),
                "treatment_goal_name": treatment_goal.name if treatment_goal else None,
                "email": user.email if user else None,
            },
            user_id=user.pk,
        )
        transaction.on_commit(
            lambda: chord(tasks)(async_forsys_run.si(scenario_id=scenario.pk))
        )
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


def feature_to_project_area(
    scenario: Scenario,
    geometry_dict: Dict[str, Any],
    idx: int = 1,
):
    user = scenario.user
    stand_size = scenario.get_stand_size()
    try:
        area_name = f"Project Area {idx}"
        logger.info("creating project area %s %s", area_name, geometry_dict)
        _bbox = geometry_dict.pop("bbox", None)
        geometry = coerce_geometry(geometry_dict)

        stand_count = Stand.objects.within_polygon(
            geometry,
            stand_size,
        ).count()

        project_area = {
            "geometry": geometry,
            "name": area_name,
            "created_by": user,
            "scenario": scenario,
        }
        data = {"treatment_rank": idx, "stand_count": stand_count}
        proj_area_obj = ProjectArea.objects.create(**project_area)
        proj_area_obj.data = {**data, "project_id": proj_area_obj.pk}
        proj_area_obj.save()

        action.send(
            user,
            verb="created",
            action_object=proj_area_obj,
            target=scenario,
        )

        return proj_area_obj

    except Exception as e:
        logger.exception("Unable to create project area for scenario %s", scenario.name)
        raise e


@transaction.atomic()
def create_scenario_from_upload(validated_data, user) -> Scenario:
    planning_area = PlanningArea.objects.get(pk=validated_data["planning_area"])
    feature_collection = validated_data["geometry"]

    scenario = Scenario.objects.create(
        name=validated_data["name"],
        planning_area=planning_area,
        user=user,
        configuration={"stand_size": validated_data["stand_size"]},
        origin=ScenarioOrigin.USER,
    )
    scenario.capabilities = compute_scenario_capabilities(scenario)
    scenario.save(update_fields=["capabilities"])

    transaction.on_commit(
        partial(
            action.send,
            sender=scenario.user,
            verb="created",
            action_object=scenario,
            target=scenario.planning_area,
        )
    )
    project_areas = list(
        map(
            lambda i: feature_to_project_area(
                scenario=scenario,
                idx=i[0],
                geometry_dict=i[1].get("geometry", {}),
            ),
            enumerate(feature_collection.get("features"), 1),
        )
    )
    result = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": json.loads(pa.geometry.json),
                "properties": pa.data,
            }
            for pa in project_areas
        ],
    }
    ScenarioResult.objects.create(
        scenario=scenario,
        result=result,
        status="SUCCESS",
    )
    track_openpanel(
        name="planning.scenario.created",
        properties={
            "origin": ScenarioOrigin.USER,
            "treatment_goal_id": None,
            "treatment_goal_category": None,
            "treatment_goal_name": None,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )
    return scenario


@transaction.atomic
def delete_scenario(
    user: User,
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
    track_openpanel(
        name="planning.scenario.deleted",
        properties={
            "soft": True,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )
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


def build_run_configuration(scenario: "Scenario") -> Dict[str, Any]:
    tx_goal = scenario.treatment_goal

    datalayers = []
    if tx_goal:
        datalayers = [
            {
                "id": tgudl.datalayer.id,
                "name": tgudl.datalayer.name,
                "metric": get_datalayer_metric(tgudl.datalayer),
                "type": tgudl.datalayer.type,
                "geometry_type": tgudl.datalayer.geometry_type,
                "threshold": tgudl.threshold,
                "usage_type": tgudl.usage_type,
            }
            for tgudl in tx_goal.datalayer_usages.all()
        ]

    cfg = dict(getattr(scenario, "configuration", {}) or {})
    if feature_enabled("SCENARIO_DRAFTS"):
        OPERATOR_MAP = {
            "eq": "=",
            "lt": "<",
            "lte": "<=",
            "gt": ">",
            "gte": ">=",
        }

        for constraint in cfg.get("constraints", []):
            datalayer_id = constraint.get("datalayer")
            operator = constraint.get("operator")
            value = constraint.get("value")

            if datalayer_id and operator and value is not None:
                dl = DataLayer.objects.get(pk=datalayer_id)
                datalayers.append(
                    {
                        "id": dl.pk,
                        "name": dl.name,
                        "metric": get_datalayer_metric(dl),
                        "type": dl.type,
                        "geometry_type": dl.geometry_type,
                        "threshold": f"value {OPERATOR_MAP.get(operator, operator)} {value}",
                        "usage_type": "THRESHOLD",
                    }
                )
    else:
        max_slope = cfg.get("max_slope")
        if max_slope:
            slope = get_datalayer_by_module_atribute("forsys", "name", "slope")
            datalayers.append(
                {
                    "id": slope.pk,
                    "name": slope.name,
                    "metric": get_datalayer_metric(slope),
                    "type": slope.type,
                    "geometry_type": slope.geometry_type,
                    "threshold": f"value <= {max_slope}",
                    "usage_type": "THRESHOLD",
                }
            )

        distance_from_roads = cfg.get("min_distance_from_road")
        if distance_from_roads:
            roads = get_datalayer_by_module_atribute(
                "forsys", "name", "distance_from_roads"
            )
            distance_from_roads_meters = distance_from_roads / 1.094
            datalayers.append(
                {
                    "id": roads.pk,
                    "name": roads.name,
                    "metric": get_datalayer_metric(roads),
                    "type": roads.type,
                    "geometry_type": roads.geometry_type,
                    "threshold": f"value <= {distance_from_roads_meters}",
                    "usage_type": "THRESHOLD",
                }
            )

    min_area_project = get_min_project_area(scenario)
    number_of_projects = cfg.get(
        "max_project_count", settings.DEFAULT_MAX_PROJECT_COUNT
    )
    max_area_project = get_max_area_project(
        scenario=scenario,
        number_of_projects=number_of_projects,
    )

    sdw = settings.FORSYS_SDW
    epw = settings.FORSYS_EPW
    exclusion_limit = settings.FORSYS_EXCLUSION_LIMIT
    sample_fraction = settings.FORSYS_SAMPLE_FRACTION
    seed = cfg.get("seed")

    variables = {
        "min_area_project": min_area_project,
        "max_area_project": max_area_project,
        "number_of_projects": number_of_projects,
        "spatial_distribution_weight": sdw,
        "edge_proximity_weight": epw,
        "exclusion_limit": exclusion_limit,
        "sample_fraction": sample_fraction,
        "seed": seed,
    }

    return {
        "stand_size": scenario.get_stand_size(),
        "datalayers": datalayers,
        "variables": variables,
    }


def validate_scenario_configuration(scenario: "Scenario") -> List[str]:
    errors: List[str] = []

    if scenario.result_status != ScenarioResultStatus.PENDING:
        return [f"Scenario cannot be run on status {scenario.result_status}."]

    if scenario.status == ScenarioStatus.ARCHIVED:
        errors.append("Archived scenarios cannot be run.")

    if not scenario.treatment_goal:
        errors.append("Scenario has no Treatment Goal assigned.")

    cfg = dict(getattr(scenario, "configuration", {}) or {})

    stand_size = cfg.get("stand_size")
    if not stand_size:
        errors.append("Configuration field `stand_size` is required.")

    targets = cfg.get("targets") or {}
    max_area = targets.get("max_area")
    if max_area is None:
        errors.append("Configuration target `max_area` (number of acres) is required.")

    return errors


@transaction.atomic()
def trigger_scenario_run(scenario: "Scenario", user: User) -> "Scenario":
    from planning.tasks import (
        async_calculate_stand_metrics,
        async_forsys_run,
        async_pre_forsys_process,
    )

    # schedule: metrics → pre-forsys → forsys
    tx_goal = scenario.treatment_goal
    datalayers = tx_goal.get_raster_datalayers() if tx_goal else []
    truncated_stand_grid_keys = get_truncated_stands_grid_keys(
        scenario.planning_area, scenario.get_stand_size()
    )
    tasks = [
        async_calculate_stand_metrics.si(
            planning_area_id=scenario.planning_area.pk,
            datalayer_id=d.pk,
            stand_size=scenario.get_stand_size(),
            grid_key_start=grid_key_start,
        )
        for d in datalayers
        for grid_key_start in truncated_stand_grid_keys
    ]
    tasks.append(async_pre_forsys_process.si(scenario_id=scenario.pk))

    track_openpanel(
        name="planning.scenario.triggered",
        properties={
            "origin": scenario.origin,
            "treatment_goal_id": tx_goal.pk if tx_goal else None,
            "treatment_goal_category": (tx_goal.category if tx_goal else None),
            "treatment_goal_name": (tx_goal.name if tx_goal else None),
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )

    action.send(
        user, verb="triggered", action_object=scenario, target=scenario.planning_area
    )

    transaction.on_commit(
        lambda: chord(tasks)(async_forsys_run.si(scenario_id=scenario.pk))
    )
    return scenario


def get_cost_per_acre(configuration: dict) -> float:
    return configuration.get("est_cost") or settings.DEFAULT_ESTIMATED_COST


def get_max_treatable_area(configuration: Dict[str, Any]) -> float:
    max_budget = configuration.get("max_budget") or None
    cost_per_acre = get_cost_per_acre(configuration=configuration)
    if max_budget:
        return max_budget / cost_per_acre

    return float(configuration.get("max_treatment_area_ratio"))


def get_max_area_project(scenario: Scenario, number_of_projects: int) -> float:
    configuration = scenario.configuration
    if feature_enabled("SCENARIO_DRAFTS"):
        targets = configuration.get("targets", {}) or {}
        max_area = targets.get("max_area")
        if max_area:
            return float(max_area) / number_of_projects
        max_acres = get_min_project_area(scenario)
        return float(max_acres)

    max_budget = configuration.get("max_budget")
    cost_per_acre = get_cost_per_acre(configuration=configuration)
    if max_budget and cost_per_acre > 0:
        return (max_budget / cost_per_acre) / number_of_projects

    max_area = configuration.get("max_area")
    if max_area:
        return max_area / number_of_projects

    max_acres = get_min_project_area(scenario)
    return float(max_acres)


def get_max_treatable_stand_count(
    max_treatable_area: float,
    stand_size: StandSizeChoices,
) -> int:
    stand_area = area_from_size(stand_size)
    return math.floor(max_treatable_area / stand_area)


def get_acreage(geometry: GEOSGeometry) -> float:
    try:
        shapely_geom = wkt.loads(geometry.wkt)
        geod = Geod(ellps="WGS84")
        area_sq_meters, *_ = geod.geometry_area_perimeter(shapely_geom)
        area_sq_meters = abs(area_sq_meters)
        acres = area_sq_meters / settings.CONVERSION_SQM_ACRES
        return acres
    except Exception:
        raise InvalidGeometry("Could not calculate area")


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
            type = "int64"
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
        case dict() as v:
            type = "json"
    return (key, type)


def get_schema(
    geojson: Union[Collection[Dict[str, Any]], Dict[str, Any]],
) -> Dict[str, Any]:
    feature = {}
    match geojson:
        case {"type": "FeatureCollection", "features": features}:
            feature = features[0]
        case {"properties": _properties, "geometry": _geometry}:
            feature = geojson
        case list() as features:
            feature = features[0]

    field_type_pairs = list(map(map_property, feature.get("properties", {}).items()))
    schema = {
        "geometry": feature.get("geometry", {}).get("type", "MultiPolygon")
        or "MultiPolygon",
        "properties": field_type_pairs,
    }
    return schema


def _get_datalayers_id_lookup_table(scenario):
    # Lookup table to rename datalayer fields to their names
    # e.g. datalayer_1 -> datalaye_Elevation
    datalayers = scenario.treatment_goal.get_raster_datalayers()  # type: ignore
    dl_lookup = dict()
    for dl in datalayers:
        dl_lookup[f"datalayer_{dl.pk}"] = f"datalayer_{dl.name}"
        dl_lookup[f"datalayer_{dl.pk}_SMP"] = f"datalayer_{dl.name}_SMP"
        dl_lookup[f"datalayer_{dl.pk}_PCP"] = f"datalayer_{dl.name}_PCP"
    return dl_lookup


def get_flatten_geojson(scenario: Scenario) -> Dict[str, Any]:
    """
    Get the geojson result of a scenario.
    This function modifies the properties of the geojson features
    to flatten nested dictionaries by appending the keys.
    """
    geojson = scenario.get_geojson_result()
    dl_lookup = _get_datalayers_id_lookup_table(scenario)
    features = geojson.get("features", [])
    for feature in features:
        properties = feature.get("properties", {})
        new_properties = {}
        for prop, value in properties.items():
            if isinstance(value, dict):
                for k, v in value.items():
                    if isinstance(v, float):
                        v = truncate_result(v, quantize=".001")
                    new_properties[f"{prop}_{k}"] = v
            else:
                if isinstance(value, float):
                    value = truncate_result(value, quantize=".001")
                key = dl_lookup.get(prop, prop)
                new_properties[key] = value
        feature["properties"] = new_properties
    return geojson


def export_to_shapefile(scenario: Scenario) -> Path:
    """Given a scenario, export it to shapefile
    and return the path of the folder containing all files.
    """

    if scenario.results.status != ScenarioResultStatus.SUCCESS:
        raise ValueError("Cannot export a scenario if it's result failed.")
    geojson = get_flatten_geojson(scenario)
    schema = get_schema(geojson)
    shapefile_folder = scenario.get_shapefile_folder()
    shapefile_file = f"{scenario.name}.shp"
    shapefile_path = shapefile_folder / shapefile_file
    if not shapefile_folder.exists():
        shapefile_folder.mkdir(parents=True)
    if shapefile_path.exists():
        shapefile_path.unlink()
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".shp")):
            crs = from_epsg(settings.DEFAULT_CRS)
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
    except Exception as e:
        logger.exception("Error exporting scenario %s to shapefile: %s", scenario.pk, e)
        raise e
    return shapefile_folder


def export_scenario_stand_outputs_to_geopackage(
    scenario: Scenario, geopackage_path: Path, stand_inputs: Dict[int, Dict]
) -> None:
    forsys_folder = scenario.get_forsys_folder()
    stnd_file = forsys_folder / f"stnd_{scenario.uuid}.csv"
    scenario_outputs = {}
    dl_lookup = _get_datalayers_id_lookup_table(scenario)
    stand_size = scenario.get_stand_size()
    with open(stnd_file, "r") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            properties = {}
            for key, value in row.items():
                match key:
                    case "stand_id", "proj_id", "Pr_1_priority", "ETrt_YR":
                        properties[key] = int(value)
                    case "DoTreat", "selected":
                        properties[key] = bool(int(value))
                    case _:
                        try:
                            f = float(value)
                            f = truncate_result(f, quantize=".001")
                        except ValueError:
                            logger.warning(
                                "Value %s for key %s in scenario %s is not a float.",
                                value,
                                key,
                                scenario.pk,
                            )
                            f = None
                        prop = dl_lookup.get(key, key)
                        properties[prop] = f
            stand_id = int(row.get("stand_id"))  # type: ignore
            geometry = stand_inputs.get(stand_id, {}).get("WKT")
            properties["WKT"] = geometry
            properties["stand_size"] = stand_size
            scenario_outputs[stand_id] = properties

    features = []
    for stand_id, properties in scenario_outputs.items():
        geometry = properties.pop("WKT", None)
        if geometry:
            feature = {
                "geometry": geometry,
                "properties": properties,
            }
            features.append(feature)
        else:
            logger.warning(
                "Stand %s in scenario %s has no geometry. Skipping.",
                stand_id,
                scenario.pk,
            )

    properties = features[0].get("properties", {})
    field_type_pairs = list(map(map_property, properties.items()))
    schema = {
        "geometry": "MultiPolygon",
        "properties": field_type_pairs,
    }

    crs = from_epsg(settings.CRS_GEOPACKAGE_EXPORT)
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".gpkg,.gpkg-journal")):
            with fiona.open(
                geopackage_path,
                "w",
                layer="stand_outputs",
                crs=crs,
                driver="GPKG",
                schema=schema,
                allow_unsupported_drivers=True,
            ) as out:
                for feature in features:
                    out.write(feature)
    except Exception as e:
        logger.exception(
            "Error exporting scenario %s outputs to geopackage: %s", scenario.pk, e
        )
        raise e


def export_scenario_inputs_to_geopackage(
    scenario: Scenario, geopackage_path: Path
) -> Dict[int, Dict]:
    forsys_folder = scenario.get_forsys_folder()
    inputs_file = forsys_folder / "inputs.csv"
    scenario_inputs = dict()
    dl_lookup = _get_datalayers_id_lookup_table(scenario)
    stand_size = scenario.get_stand_size()
    with open(inputs_file, "r") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            properties = {}
            for key, value in row.items():
                match key:
                    case "stand_id":
                        properties[key] = int(value)
                    case "WKT":
                        try:
                            geom = GEOSGeometry(value, srid=settings.AREA_SRID)
                            geom_json = geom.transform(
                                settings.CRS_GEOPACKAGE_EXPORT, clone=True
                            ).json
                            geom_json = json.loads(geom_json)
                            properties[key] = to_multi(geom_json)
                        except Exception as e:
                            logger.error(
                                "Invalid WKT for scenario %s: %s", scenario.pk, e
                            )
                            raise InvalidGeometry(f"Invalid WKT: {value}")
                    case _:
                        try:
                            f = float(value)
                            f = truncate_result(f, quantize=".001")
                        except ValueError:
                            logger.warning(
                                "Value %s for key %s in scenario %s is not a float.",
                                value,
                                key,
                                scenario.pk,
                            )
                            f = None
                        prop_key = dl_lookup.get(key, key)
                        properties[prop_key] = f
            properties["stand_size"] = stand_size
            stand_id = int(row.get("stand_id"))  # type: ignore
            scenario_inputs[stand_id] = properties

    stand_id = next(iter(scenario_inputs))
    feature = scenario_inputs[stand_id].copy()
    feature.pop("WKT", None)  # Remove WKT if present
    field_type_pairs = list(map(map_property, feature.items()))
    schema = {
        "geometry": "MultiPolygon",
        "properties": field_type_pairs,
    }
    crs = from_epsg(settings.CRS_GEOPACKAGE_EXPORT)
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".gpkg,.gpkg-journal")):
            with fiona.open(
                geopackage_path,
                "w",
                layer="stand_inputs",
                crs=crs,
                driver="GPKG",
                schema=schema,
                allow_unsupported_drivers=True,
            ) as out:
                for stand_id, feature in scenario_inputs.items():
                    copyed_feature = feature.copy()
                    geometry = copyed_feature.pop("WKT", None)
                    copyed_feature = {
                        "properties": copyed_feature,
                        "geometry": geometry,
                    }
                    out.write(copyed_feature)

    except Exception as e:
        logger.exception(
            "Error exporting scenario %s to geopackage: %s", scenario.pk, e
        )
        raise e
    return scenario_inputs


def export_scenario_project_areas_outputs_to_geopackage(
    scenario: Scenario, geopackage_path: Path
) -> None:
    geojson = get_flatten_geojson(scenario)
    schema = get_schema(geojson)
    crs = from_epsg(settings.CRS_GEOPACKAGE_EXPORT)
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".gpkg,.gpkg-journal")):
            with fiona.open(
                geopackage_path,
                "w",
                layer="project_areas_outputs",
                crs=crs,
                driver="GPKG",
                schema=schema,
                allow_unsupported_drivers=True,
            ) as out:
                for feature in geojson.get("features", []):
                    geometry = to_multi(feature.get("geometry"))
                    feature = {**feature, "geometry": geometry}
                    out.write(feature)
    except Exception as e:
        logger.exception(
            "Error exporting scenario %s to geopackage: %s", scenario.pk, e
        )
        raise e


def export_planning_area_to_geopackage(
    planning_area: PlanningArea, geopackage_path: Path
) -> None:
    """Given a planning area, export it to geopackage"""

    geometry = planning_area.geometry
    if not geometry:
        raise ValueError("Planning area has no geometry")

    crs = from_epsg(settings.CRS_GEOPACKAGE_EXPORT)
    schema = {
        "geometry": "MultiPolygon",
        "properties": [("id", "int"), ("name", "str:128"), ("region_name", "str:128")],
    }
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".gpkg,.gpkg-journal")):
            with fiona.open(
                geopackage_path,
                "w",
                layer="planning_area",
                crs=crs,
                driver="GPKG",
                schema=schema,
                allow_unsupported_drivers=True,
            ) as out:
                geometry_json = json.loads(
                    geometry.transform(settings.CRS_GEOPACKAGE_EXPORT, clone=True).json
                )
                feature = {
                    "geometry": to_multi(geometry_json),
                    "properties": {
                        "id": planning_area.pk,
                        "name": planning_area.name,
                        "region_name": planning_area.region_name or "",
                    },
                }
                out.write(feature)
    except Exception as e:
        logger.exception(
            "Error exporting planning area %s to geopackage: %s", planning_area.pk, e
        )
        raise e


def export_to_geopackage(scenario: Scenario, regenerate=False) -> Optional[str]:
    try:
        if not regenerate and scenario.geopackage_url:
            logger.info(
                "Scenario %s already has a geopackage URL: %s",
                scenario.pk,
                scenario.geopackage_url,
            )
            return scenario.geopackage_url

        temp_folder = Path(settings.TEMP_GEOPACKAGE_FOLDER)
        if not temp_folder.exists():
            temp_folder.mkdir(parents=True)
        temp_file = temp_folder / f"{scenario.uuid}.gpkg"
        if temp_file.exists():
            temp_file.unlink()

        scenario.geopackage_status = GeoPackageStatus.PROCESSING
        scenario.save(update_fields=["geopackage_status", "updated_at"])

        export_planning_area_to_geopackage(scenario.planning_area, temp_file)
        export_scenario_project_areas_outputs_to_geopackage(scenario, temp_file)
        stand_inputs = export_scenario_inputs_to_geopackage(scenario, temp_file)
        export_scenario_stand_outputs_to_geopackage(scenario, temp_file, stand_inputs)

        geopackage_path = f"gs://{settings.GCS_MEDIA_BUCKET}/{settings.GEOPACKAGES_FOLDER}/{scenario.uuid}.gpkg.zip"
        zip_file = temp_folder / f"{scenario.uuid}.gpkg.zip"
        if zip_file.exists():
            zip_file.unlink()
        with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(temp_file, arcname=temp_file.name)

        upload_file_via_cli(
            object_name=geopackage_path.replace(
                f"gs://{settings.GCS_MEDIA_BUCKET}/", ""
            ),
            input_file=str(zip_file),
            bucket_name=settings.GCS_MEDIA_BUCKET,
        )

        temp_file.unlink(missing_ok=True)
        scenario.geopackage_url = geopackage_path
        scenario.geopackage_status = GeoPackageStatus.SUCCEEDED
        scenario.save(
            update_fields=["geopackage_url", "geopackage_status", "updated_at"]
        )

        return str(geopackage_path)
    except Exception:
        logger.exception("Failed to export to geopackage")
        scenario.geopackage_url = None
        scenario.geopackage_status = GeoPackageStatus.FAILED
        scenario.save(
            update_fields=["geopackage_url", "geopackage_status", "updated_at"]
        )


@transaction.atomic()
def toggle_scenario_status(scenario: Scenario, user: User) -> Scenario:
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


def planning_area_covers(
    planning_area: PlanningArea,
    geometry: GEOSGeometry,
    stand_size: StandSizeChoices,
    buffer_size: float = -1.0,
) -> bool:
    """Specialized version of `covers` predicate for Planning Area.
    This is necessary because some times our users want to upload
    project areas that are slightly off the planning area. So this
    function first considers the Planning Area itself, then all the
    stands that make up the planning area and lastly it considers
    a buffered version of the test geometry (negative means smaller).
    """
    if planning_area.geometry.covers(geometry):
        logger.info("Planning Area covers geometry using DE9IM matrix.")
        return True

    all_stands = Stand.objects.within_polygon(
        planning_area.geometry,
        stand_size,
    ).aggregate(geometry=UnionOp("geometry"))["geometry"]

    if all_stands is None:
        return False

    if all_stands.covers(geometry):
        logger.info("Planning Area covers geometry using stands DE9IM matrix.")
        return True

    # units here are in meters
    test_geometry = geometry.transform(settings.AREA_SRID, clone=True)
    test_geometry = test_geometry.buffer(buffer_size).transform(4269, clone=True)

    if all_stands.covers(test_geometry):
        logger.info(
            "Planning Area covers geometry using a buffered version of test geometry."
        )
        return True
    return False


def get_excluded_stands(stands_qs, datalayer: DataLayer):
    return stands_qs.filter(
        metrics__datalayer_id=datalayer.pk, metrics__majority=1
    ).values_list("id", flat=True)


def get_constrained_stands(
    stands_qs,
    datalayer: DataLayer,
    operator: Optional[str] = None,
    value: Union[str, float] = 1.0,
    metric_column: Optional[str] = None,
    usage_type: TreatmentGoalUsageType = TreatmentGoalUsageType.THRESHOLD,
):
    if not metric_column:
        metric_column = (
            datalayer.metadata.get("modules", {})
            .get("forsys", {})
            .get("metric_column", "avg")
        )
    if not operator:
        metric_filter = f"metrics__{metric_column}"
    else:
        metric_filter = f"metrics__{metric_column}__{operator}"
    logger.info(f"processing metric_filter {metric_filter} with value {value}")

    stands_qs = stands_qs.filter(metrics__datalayer_id=datalayer.pk)
    match usage_type:
        case TreatmentGoalUsageType.THRESHOLD:
            stands_qs = stands_qs.exclude(**{metric_filter: value})
        case _:
            raise ValueError("Invalid usage_type for get_constrainted_stands.")

    return stands_qs.values_list("id", flat=True)


def get_available_stands(
    planning_area: PlanningArea,
    *,
    stand_size: str = "LARGE",
    includes: Optional[List[DataLayer]] = None,
    excludes: Optional[List[DataLayer]] = None,
    constraints: Optional[List[Dict[str, Any]]] = None,
    **kwargs,
):
    if not includes:
        includes = list()
    if not excludes:
        excludes = list()
    if not constraints:
        constraints = list()
    area_transform = Area(Transform("geometry", settings.AREA_SRID))
    stands = planning_area.get_stands(stand_size).annotate(area=area_transform)
    total_area = stands.all().aggregate(total_area_m2=Sum("area"))["total_area_m2"]

    excluded_ids = []
    constrained_ids = []
    for exclude in excludes:
        stands_queryset = stands.all()
        excluded_stands = get_excluded_stands(stands_queryset, exclude)
        excluded_ids.extend(list(excluded_stands.values_list("id", flat=True)))

    for constraint in constraints:
        stands_queryset = stands.all()
        constrained_stands = get_constrained_stands(
            stands_queryset,
            constraint.get("datalayer"),
            constraint.get("operator"),
            constraint.get("value"),
            usage_type=TreatmentGoalUsageType.THRESHOLD,
        )
        constrained_ids.extend(list(constrained_stands))
    excluded_ids = set(excluded_ids)
    constrained_ids = set(constrained_ids)
    only_constrained_ids = constrained_ids - excluded_ids
    total_excluded_area = (
        Stand.objects.filter(id__in=excluded_ids)
        .annotate(area=area_transform)
        .aggregate(total_area_m2=Sum("area"))["total_area_m2"]
    )
    total_constrained_area = (
        Stand.objects.filter(id__in=only_constrained_ids)
        .annotate(area=area_transform)
        .aggregate(total_area_m2=Sum("area"))["total_area_m2"]
    )
    if not total_area:
        total_area = A(sq_m=0)
    if not total_excluded_area:
        total_excluded_area = A(sq_m=0)
    if not total_constrained_area:
        total_constrained_area = A(sq_m=0)

    available_area = total_area - total_excluded_area
    treatable_area = available_area - total_constrained_area
    total_unavailable_area = total_excluded_area + total_constrained_area
    return {
        "unavailable": {
            "by_inclusions": [],
            "by_exclusions": excluded_ids,
            "by_thresholds": constrained_ids,
        },
        "summary": {
            "total_area": total_area.sq_m / settings.CONVERSION_SQM_ACRES,
            "available_area": available_area.sq_m / settings.CONVERSION_SQM_ACRES,
            "treatable_area": max(treatable_area.sq_m, 0)
            / settings.CONVERSION_SQM_ACRES,
            "unavailable_area": total_unavailable_area.sq_m
            / settings.CONVERSION_SQM_ACRES,
        },
    }


def get_available_stand_ids(
    planning_area: PlanningArea,
    stand_size: str = "LARGE",
    excludes: Optional[List[DataLayer]] = None,
) -> List[int]:
    if not excludes:
        excludes = list()

    stands = planning_area.get_stands(stand_size=stand_size)

    excluded_ids = []
    for exclude in excludes:
        stands_queryset = stands.all()
        excluded_stands = get_excluded_stands(stands_queryset, exclude)
        excluded_ids.extend(list(excluded_stands.values_list("id", flat=True)))

    stand_ids = stands.values_list("id", flat=True)

    stand_ids = set(stand_ids) - set(excluded_ids)
    return list(stand_ids)


def get_min_project_area(scenario: Scenario) -> float:
    stand_size = scenario.get_stand_size()
    match stand_size:
        case StandSizeChoices.SMALL:
            return settings.MIN_AREA_PROJECT_SMALL
        case StandSizeChoices.MEDIUM:
            return settings.MIN_AREA_PROJECT_MEDIUM
        case _:
            return settings.MIN_AREA_PROJECT_LARGE
