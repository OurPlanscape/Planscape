import numpy as np
from base.region_name import RegionName
from conditions.models import BaseCondition, Condition, ConditionRaster
from config.conditions_config import PillarConfig
from django.contrib.gis.gdal import CoordTransform, SpatialReference
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from plan.models import ConditionScores, Plan
from planscape import settings

# Name of the table and column from models.py.
RASTER_SCHEMA = 'public'
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'


# Returns np.nan if no entries are available.
# This should be differentiated from None, which is a possible value if the
# score was previously computed, but no intersection exists between a plan
# geometry and the condition raster.
# TODO: return enum values or status instead of None or np.nan.
def _get_db_score_for_plan(plan_id, condition_id) -> float | None:
    db_scores = ConditionScores.objects.filter(
        plan_id=plan_id).filter(condition_id=condition_id).all()
    if len(db_scores) > 0:
        return db_scores[0].mean_score
    return np.nan


# Returns a geometry in the raster SRS.
def get_raster_geo(geo: GEOSGeometry) -> GEOSGeometry:
    if geo.srid == settings.CRS_FOR_RASTERS:
        return geo
    geo.transform(
        CoordTransform(
            SpatialReference(geo.srid),
            SpatialReference(settings.CRS_9822_PROJ4)))
    geo.srid = settings.CRS_FOR_RASTERS
    return geo


# Returns None if no intersection exists between a geometry and the condition
# raster.
def compute_condition_score_from_raster(
        geo: GEOSGeometry, raster_name: str) -> float | None:
    if geo is None:
        raise AssertionError("missing input geometry")
    if geo.srid != settings.CRS_FOR_RASTERS:
        raise AssertionError(
            "geometry SRID is %d (expected %d)" %
            (geo.srid, settings.CRS_FOR_RASTERS))
    if len(ConditionRaster.objects.filter(name=raster_name).all()) == 0:
        raise AssertionError(
            "no rasters available for raster_name, %s" % (raster_name))
    with connection.cursor() as cursor:
        cursor.callproc(
            'get_mean_condition_score',
            (RASTER_TABLE, RASTER_SCHEMA, raster_name,
             RASTER_NAME_COLUMN, RASTER_COLUMN, geo.ewkb))
        fetch = cursor.fetchone()
        if fetch is None or len(fetch) == 0:
            return None
        return fetch[0]


# Returns a {condition name: condition score} dictionary for a given plan.
# First tries to look up plan details in a database.
# If that's unavailable, computes them from condition rasters and the plan
# geometry.
# Of note, condition score may be None. This occurs if there is no overlap
# between the geometry and non-nan values in the raster.
def fetch_or_compute_mean_condition_scores(
        plan: Plan) -> dict[str, float | None]:
    reg = plan.region_name.removeprefix('RegionName.').lower()
    if reg not in RegionName.__members__.values():
        raise AssertionError("region, %s, is invalid" % (reg))
    geo = plan.geometry
    if geo is None:
        raise AssertionError("plan is missing geometry")

    geo = get_raster_geo(geo)

    ids_to_condition_names = {
        c.pk: c.condition_name
        for c in BaseCondition.objects.filter(region_name=reg).all()}
    if len(ids_to_condition_names.keys()) == 0:
        raise AssertionError("no conditions exist for region, %s" % reg)

    conditions = Condition.objects.filter(
        condition_dataset_id__in=ids_to_condition_names.keys()).filter(
        is_raw=False).all()

    condition_scores = {}
    for condition in conditions:
        id = condition.condition_dataset.pk
        name = ids_to_condition_names[id]

        # score is np.nan if no entries are available.
        # score is None if it was previously computed, but no overlap exists.
        # between the plan geometry and the condition raster.
        score = _get_db_score_for_plan(plan.pk, condition.pk)
        if score is None or not np.isnan(score):
            condition_scores[name] = score
            continue

        score = compute_condition_score_from_raster(geo, condition.raster_name)
        condition_scores[name] = score
        ConditionScores.objects.create(
            plan=plan, condition=condition, mean_score=score)

    return condition_scores
