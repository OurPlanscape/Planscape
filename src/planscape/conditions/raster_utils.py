import numpy as np
from base.region_name import RegionName
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.contrib.gis.gdal import CoordTransform, SpatialReference
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from planscape import settings
from typing import TypedDict

# Name of the table and column from models.py.
RASTER_SCHEMA = "public"
RASTER_CONDITION_TABLE = "conditions_conditionraster"
RASTER_COLUMN = "raster"
RASTER_NAME_COLUMN = "name"


# Statistics across stands within a subarea of a raster.
class ConditionStatistics(TypedDict):
    # Mean across stand values (sum / count)
    mean: float
    # Sum of stand values.
    sum: float
    # The number of stands counted.
    count: int


# A collection of raw raster pixel values.
class RasterPixelValues(TypedDict):
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


ConditionPixelValues = RasterPixelValues


# Validates that a geomeetry is compatible with rasters stored in the DB.
# This must be called before a postGIS function call.
def _validate_geo(geo: GEOSGeometry) -> None:
    if geo is None:
        raise AssertionError("missing input geometry")
    if not geo.valid:
        raise AssertionError("invalid geo: %s" % geo.valid_reason)
    if geo.srid != settings.CRS_FOR_RASTERS:
        raise AssertionError(
            "geometry SRID is %d (expected %d)" % (geo.srid, settings.CRS_FOR_RASTERS)
        )


# Validates that the raster name exists.
# This should be called before a postGIS function call.
def _validate_condition_raster_name(raster_name: str) -> None:
    if len(ConditionRaster.objects.filter(name=raster_name).all()) == 0:
        raise AssertionError("no rasters available for raster_name, %s" % (raster_name))


# # Returns None if no statistics are stored in the database.
# # Otherwise, returns the fetched ConditionScores instance.
# def _get_db_stats_for_plan(plan_id, condition_id) -> ConditionStatistics | None:
#     db_score = (
#         ConditionScores.objects.filter(plan_id=plan_id)
#         .filter(condition_id=condition_id)
#         .first()
#     )
#     if db_score is None:
#         return None
#     return ConditionStatistics(
#         {"mean": db_score.mean_score, "sum": db_score.sum, "count": db_score.count}
#     )


# Sets a dictionary key value if it doesn't exist.
def _set_if_not_none(values: dict, key: str, value: float) -> None:
    if key not in values.keys():
        values[key] = value


# With the expectation that a dictionary key value is a list, either appends
# the input value to the list or sets the key value to a list with the input
# value.
def _append_to_list(values: dict, key: str, value: int | float) -> None:
    if key in values.keys():
        values[key].append(value)
    else:
        values[key] = [value]


# Returns a geometry in the raster SRS.
def get_raster_geo(geo: GEOSGeometry) -> GEOSGeometry:
    if geo.srid == settings.CRS_FOR_RASTERS:
        return geo
    transformed_geo = geo.clone()
    transformed_geo.transform(
        CoordTransform(
            SpatialReference(geo.srid), SpatialReference(settings.CRS_9822_PROJ4)
        )
    )
    transformed_geo.srid = settings.CRS_FOR_RASTERS
    return transformed_geo


# Returns None if no intersection exists between a geometry and the condition
# raster.
# Otherwise, returns ConditionStatistics.
def compute_condition_stats_from_raster(
    geo: GEOSGeometry, raster_name: str
) -> ConditionStatistics | None:
    _validate_condition_raster_name(raster_name)
    _validate_geo(geo)
    with connection.cursor() as cursor:
        cursor.callproc(
            "get_condition_stats",
            (
                RASTER_CONDITION_TABLE,
                RASTER_SCHEMA,
                raster_name,
                RASTER_NAME_COLUMN,
                RASTER_COLUMN,
                geo.ewkb,
            ),
        )
        fetch = cursor.fetchone()
        if fetch is None or len(fetch) != 3:
            return ConditionStatistics({"mean": None, "sum": 0.0, "count": 0})
        return ConditionStatistics(
            {
                "mean": fetch[0],
                "sum": 0 if fetch[1] is None else fetch[1],
                "count": 0 if fetch[2] is None else fetch[2],
            }
        )


# Fetches raster pixel values for all non-NaN pixels that intersect with geo.
# If no intersection exists, returns None.
def get_pixel_values_from_raster(
    geo: GEOSGeometry, table_name: str, raster_name: str
) -> RasterPixelValues | None:
    _validate_geo(geo)
    with connection.cursor() as cursor:
        cursor.callproc(
            "get_condition_pixels",
            (
                table_name,
                RASTER_SCHEMA,
                raster_name,
                RASTER_NAME_COLUMN,
                RASTER_COLUMN,
                geo.ewkb,
            ),
        )
        fetch = cursor.fetchall()
    if len(fetch) == 0:
        return None
    values = {}
    for entry in fetch:
        _set_if_not_none(values, "upper_left_coord_x", entry[0])
        _set_if_not_none(values, "upper_left_coord_y", entry[1])
        # Pixel 1 is located at index 1 (not 0).
        _append_to_list(values, "pixel_dist_x", entry[2] - 1)
        _append_to_list(values, "pixel_dist_y", entry[3] - 1)
        _append_to_list(values, "values", entry[4])
    return RasterPixelValues(values)


def get_condition_values_from_raster(
    geo: GEOSGeometry, raster_name: str
) -> ConditionPixelValues | None:
    _validate_condition_raster_name(raster_name)
    return get_pixel_values_from_raster(geo, RASTER_CONDITION_TABLE, raster_name)
