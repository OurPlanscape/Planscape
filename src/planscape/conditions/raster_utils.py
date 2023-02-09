import numpy as np
from base.region_name import RegionName
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.contrib.gis.gdal import CoordTransform, SpatialReference
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from plan.models import ConditionScores, Plan
from planscape import settings
from typing import TypedDict

# Name of the table and column from models.py.
RASTER_SCHEMA = 'public'
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'


# Statistics across stands within a subarea of a raster.
class ConditionStatistics(TypedDict):
    # Mean across stand values (sum / count)
    mean: float
    # Sum of stand values.
    sum: float
    # The number of stands counted.
    count: int


# Returns None if no statistics are available.
# Otherwise, returns ConditionStatistics.
def _get_db_stats_for_plan(
        plan_id, condition_id) -> ConditionStatistics | None:
    db_scores = ConditionScores.objects.filter(
        plan_id=plan_id).filter(condition_id=condition_id).all()
    if len(db_scores) > 0:
        db_score = db_scores[0]
        return ConditionStatistics(
            {'mean': db_scores.mean_score,
             'sum': db_score.sum,
             'count': db_score.count})
    return None


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
# Otherwise, returns ConditionStatistics.
def compute_condition_stats_from_raster(
        geo: GEOSGeometry, raster_name: str) -> ConditionStatistics | None:
    if geo is None:
        raise AssertionError("missing input geometry")
    if not geo.valid:
        raise AssertionError("invalid geo: %s" % geo.valid_reason)
    if geo.srid != settings.CRS_FOR_RASTERS:
        raise AssertionError(
            "geometry SRID is %d (expected %d)" %
            (geo.srid, settings.CRS_FOR_RASTERS))
    if len(ConditionRaster.objects.filter(name=raster_name).all()) == 0:
        raise AssertionError(
            "no rasters available for raster_name, %s" % (raster_name))
    with connection.cursor() as cursor:
        cursor.callproc(
            'get_condition_stats',
            (RASTER_TABLE, RASTER_SCHEMA, raster_name,
             RASTER_NAME_COLUMN, RASTER_COLUMN, geo.ewkb))
        fetch = cursor.fetchone()
        if fetch is None or len(fetch) != 3 or (
                fetch[0] is None and fetch[1] is None and fetch[2] is None):
            return ConditionStatistics({'mean': None,
                                        'sum': 0.0,
                                        'count': 0})
        return ConditionStatistics(
            {'mean': fetch[0],
             'sum': fetch[1],
             'count': fetch[2]})


# Returns a {condition name: ConditionStatistics} dictionary for a given plan.
# First tries to look up plan details in a database.
# If that's unavailable, computes them from condition rasters and the plan
# geometry.
def fetch_or_compute_mean_condition_scores(
        plan: Plan) -> dict[str, ConditionStatistics]:
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

    condition_stats = {}
    for condition in conditions:
        id = condition.condition_dataset.pk
        name = ids_to_condition_names[id]

        stats = _get_db_stats_for_plan(plan.pk, condition.pk)
        if stats is not None:
            condition_stats[name] = stats
            continue

        stats = compute_condition_stats_from_raster(
            geo, condition.raster_name)
        condition_stats[name] = stats
        ConditionScores.objects.create(
            plan=plan, condition=condition, mean_score=stats['mean'],
            sum=stats['sum'],
            count=stats['count'])

    return condition_stats
