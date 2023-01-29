import numpy as np

from conditions.models import BaseCondition, Condition
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
def _get_db_score_for_plan(plan_id, condition_id) -> float:
    db_scores = ConditionScores.objects.filter(
        plan_id=plan_id).filter(condition_id=condition_id).all()
    if len(db_scores) > 0:
        return db_scores[0].mean_score
    return np.nan


# Returns None if no intersection exists between a geometry and the condition
# raster.
def compute_condition_score_from_raster(
        geo: GEOSGeometry, raster_name: str) -> float:
    if geo is None:
        raise AssertionError("must define input geometry")
    if geo.srid != settings.CRS_FOR_RASTERS:
        raise AssertionError(
            "geometry SRID is %d (expected %d" %
            (geo.srid, settings.CRS_FOR_RASTERS))
    with connection.cursor() as cursor:
        cursor.callproc(
            'get_mean_condition_score',
            (RASTER_TABLE, RASTER_SCHEMA, raster_name,
             RASTER_NAME_COLUMN, RASTER_COLUMN, geo.ewkb))
        cursor_output = list(cursor.fetchone())
        if (cursor_output is None or len(cursor_output) == 0
                or cursor_output[0] is None):
            return None
        return cursor_output[0]


def fetch_or_compute_mean_condition_scores(plan: Plan) -> dict[str, float]:
    reg = plan.region_name.removeprefix('RegionName.').lower()
    geo = plan.geometry

    if geo is None:
        raise AssertionError("plan is missing geometry")
    if geo.srid != settings.CRS_FOR_RASTERS:
        geo.transform(
            CoordTransform(SpatialReference(geo.srid),
                           SpatialReference(settings.CRS_9822_PROJ4)))
        geo.srid = settings.CRS_FOR_RASTERS

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

        score = _get_db_score_for_plan(plan.pk, condition.pk)
        if score is None or not np.isnan(score):
            condition_scores[name] = score
            continue

        score = compute_condition_score_from_raster(geo, condition.raster_name)
        condition_scores[name] = score
        ConditionScores.objects.create(
            plan=plan, condition=condition, mean_score=score)

    return condition_scores
