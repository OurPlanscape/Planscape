from conditions.models import BaseCondition, Condition
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from planscape import settings


# Name of the table and column from models.py.
RASTER_SCHEMA = 'public'
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'


def get_mean_condition_scores(geo: GEOSGeometry,
                              region: str) -> dict[str, float]:
    if geo.srid != settings.CRS_FOR_RASTERS:
        raise AssertionError("geometry has SRID, %d (expectd %d)" %
                             (geo.srid, settings.CRS_FOR_RASTERS))

    with connection.cursor() as cursor:
        ids_to_conditions = {
            c.pk: c.condition_name
            for c in BaseCondition.objects.filter(region_name=region).all()}
        raster_names_to_ids = {
            c.raster_name: c.condition_dataset.pk
            for c in Condition.objects.filter(
                condition_dataset_id__in=ids_to_conditions.keys()).filter(
                is_raw=False).all()}

        conditions = {}
        for raster_name in raster_names_to_ids.keys():
            cursor.callproc(
                'get_mean_condition_score',
                (RASTER_TABLE, RASTER_SCHEMA, raster_name, RASTER_NAME_COLUMN,
                 RASTER_COLUMN, geo.ewkb))
            score = list(cursor.fetchone())
            if score is None or len(score) == 0 or score[0] is None:
                conditions[ids_to_conditions[raster_names_to_ids[raster_name]]] = None
            else:
                conditions[ids_to_conditions[raster_names_to_ids[raster_name]]] = score[0]
        return conditions
