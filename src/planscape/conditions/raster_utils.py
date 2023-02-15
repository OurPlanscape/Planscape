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


# A collection of raw raster pixel values.
class ConditionPixelValues(TypedDict):
    # x indices of pixels relative to top-left coordinate
    pixel_dist_x: list[int]
    # y indices of pixels relative to top-left coordinate
    pixel_dist_y: list[int]
    # Raster values corresponding to the (x, y) position denoted by
    # pixel_dist_x and pixel_dist_y data columns.
    values: list[float]
    # x coordinate of the upper-left corner of a Raster image.
    upper_left_coord_x: float
    # y coordinate of the upper-left corner of a Raster image.
    upper_left_coord_y: float


# Validates that a geomeetry is compatible with rasters stored in the DB.
# This must be called before a postGIS function call.
def _validate_geo(geo: GEOSGeometry) -> None:
    if geo is None:
        raise AssertionError("missing input geometry")
    if not geo.valid:
        raise AssertionError("invalid geo: %s" % geo.valid_reason)
    if geo.srid != settings.CRS_FOR_RASTERS:
        raise AssertionError(
            "geometry SRID is %d (expected %d)" %
            (geo.srid, settings.CRS_FOR_RASTERS))


# Validates that the raster name exists.
# This should be called before a postGIS function call.
def _validate_condition_raster_name(raster_name: str) -> None:
    if len(ConditionRaster.objects.filter(name=raster_name).all()) == 0:
        raise AssertionError(
            "no rasters available for raster_name, %s" % (raster_name))


# Returns None if no statistics are stored in the database.
# Otherwise, returns the fetched ConditionScores instance.
def _get_db_stats_for_plan(
        plan_id, condition_id) -> ConditionStatistics | None:
    db_score = ConditionScores.objects.filter(
        plan_id=plan_id).filter(condition_id=condition_id).first()
    if db_score is None:
        return None
    return ConditionStatistics(
        {'mean': db_score.mean_score,
         'sum': db_score.sum,
         'count': db_score.count})


# Sets a dictionary key value if it doesn't exist.
def _set_if_not_none(
        values: dict, key: str, value: float) -> None:
    if key not in values.keys():
        values[key] = value


# With the expectation that a dictionary key value is a list, either appends
# the input value to the list or sets the key value to a list with the input
# value.
def _append_to_list(
        values: dict, key: str, value: int | float) -> None:
    if key in values.keys():
        values[key].append(value)
    else:
        values[key] = [value]


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
    _validate_geo(geo)
    _validate_condition_raster_name(raster_name)
    with connection.cursor() as cursor:
        cursor.callproc(
            'get_condition_stats',
            (RASTER_TABLE, RASTER_SCHEMA, raster_name,
             RASTER_NAME_COLUMN, RASTER_COLUMN, geo.ewkb))
        fetch = cursor.fetchone()
        if fetch is None or len(fetch) != 3:
            return ConditionStatistics({'mean': None,
                                        'sum': 0.0,
                                        'count': 0})
        return ConditionStatistics(
            {'mean': fetch[0],
             'sum': 0 if fetch[1] is None else fetch[1],
             'count': 0 if fetch[2] is None else fetch[2]})


# Returns a {condition name: ConditionStatistics} dictionary for a given plan.
# First tries to look up plan details in a database.
# If that's unavailable, computes them from condition rasters and the plan
# geometry.
def fetch_or_compute_condition_stats(
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


# Fetches raw raster pixel values for all non-NaN pixels that intersect with
# geo.
def get_condition_values_from_raster(
        geo: GEOSGeometry, raster_name: str) -> ConditionPixelValues:
    _validate_geo(geo)
    _validate_condition_raster_name(raster_name)
    with connection.cursor() as cursor:
        cursor.callproc(
            'get_condition_pixels',
            (RASTER_TABLE, RASTER_SCHEMA, raster_name,
             RASTER_NAME_COLUMN, RASTER_COLUMN, geo.ewkb))
        fetch = cursor.fetchall()
    values = {}
    for entry in fetch:
        _set_if_not_none(values, 'upper_left_coord_x', entry[0])
        _set_if_not_none(values, 'upper_left_coord_y', entry[1])
        # Pixel 1 is located at index 1 (not 0).
        _append_to_list(values, 'pixel_dist_x', entry[2] - 1)
        _append_to_list(values, 'pixel_dist_y', entry[3] - 1)
        _append_to_list(values, 'values', entry[4])
    return ConditionPixelValues(values)
