import json
import logging
from typing import Any, Collection, Dict

import rasterio
from core.flags import feature_enabled
from datasets.dynamic_models import qualify_for_django
from datasets.models import DataLayer, DataLayerType
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from django.db.models import QuerySet
from gis.info import get_gdal_env
from rasterio.windows import from_bounds
from rasterstats import zonal_stats
from shapely import total_bounds
from shapely.geometry import shape

from stands.models import Stand, StandMetric, StandSizeChoices

log = logging.getLogger(__name__)


def create_stands_for_geometry(
    geometry: GEOSGeometry,
    stand_size: StandSizeChoices,
):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT public.generate_stands_for_planning_area(
                ST_GeomFromText(%s, %s),
                %s,
                %s, %s
            );
            """,
            [
                geometry.wkt,
                settings.DEFAULT_CRS,
                stand_size,
                settings.HEX_GRID_ORIGIN_X,
                settings.HEX_GRID_ORIGIN_Y,
            ],
        )
        inserted = cur.fetchone()[0]
        log.info(f"Created {inserted} stands.")
        return inserted


def to_geojson(stand: Stand) -> Dict[str, Any]:
    geometry = stand.webmercator.json
    return {
        "type": "Feature",
        "id": stand.id,
        "properties": {
            "id": stand.id,
            "size": stand.size,
        },
        "geometry": json.loads(geometry),
    }


def to_stand_metric(
    stats_result: Dict[str, Any],
    datalayer: DataLayer,
    aggregations: Collection[str],
) -> StandMetric:
    properties = stats_result.get("properties", {}) or {}
    stand_metric_data = {
        AGGREGATION_MODEL_MAP[agg]: properties.get(agg) for agg in aggregations
    }
    return StandMetric(
        stand_id=stats_result.get("id"), datalayer_id=datalayer.pk, **stand_metric_data
    )


DEFAULT_AGGREGATIONS = (
    "min",
    "mean",
    "median",
    "max",
    "sum",
    "count",
    "majority",
    "minority",
)

AGGREGATION_MODEL_MAP = {
    "min": "min",
    "mean": "avg",
    "median": "median",
    "max": "max",
    "sum": "sum",
    "count": "count",
    "majority": "majority",
    "minority": "minority",
}
MODEL_AGGREGATION_MAP = {value: key for key, value in AGGREGATION_MODEL_MAP.items()}


def calculate_stand_vector_stats3(
    datalayer: DataLayer,
    planning_area_geometry: GEOSGeometry,
    stand_size: StandSizeChoices,
    grid_key_start: str = "",
):
    stands = Stand.objects.all().within_polygon(planning_area_geometry, stand_size)
    stand_ids = set(stands.all().values_list("id", flat=True))
    existing_metrics = StandMetric.objects.filter(
        stand_id__in=stand_ids, datalayer_id=datalayer.pk
    )
    existing_stand_ids = set(existing_metrics.all().values_list("id", flat=True))
    missing_stand_ids = stand_ids - existing_stand_ids

    if len(missing_stand_ids) <= 0:
        log.info("There are no missing stands. Early return.")
        return

    if datalayer.type == DataLayerType.RASTER:
        raise ValueError("Cannot calculate vector stats for raster layers.")
    quali_name = qualify_for_django(datalayer.table)
    query = f"""
    WITH centroid AS (
        SELECT
            id,
            ST_Centroid(geometry) as "geometry"
        FROM stands_stand s
        WHERE
            s.id IN %s
            AND grid_key LIKE %s%
    )
    INSERT INTO stands_standmetric (created_at, stand_id, datalayer_id, majority)
    SELECT
        now(),
        c.id,
        %s,
        CASE
            WHEN EXISTS (
                SELECT
                    1
                FROM {quali_name} as poly
                WHERE
                    c.geometry && poly.geometry AND
                    ST_Intersects(c.geometry, poly.geometry)
            )
            THEN 1
            ELSE 0
        END AS majority
    FROM centroid c
    ON CONFLICT ("stand_id", "datalayer_id") DO NOTHING;
    """.strip()
    with connection.cursor() as cursor:
        cursor.execute(
            query,
            [tuple(missing_stand_ids), grid_key_start, datalayer.pk],
        )


def calculate_stand_zonal_stats(
    stands: QuerySet["Stand"],
    datalayer: DataLayer,
    aggregations: Collection[str] = DEFAULT_AGGREGATIONS,
) -> QuerySet[StandMetric]:
    """This function calculates zonal stats for
    a collection of stands. This function skips
    recalculating metrics for already calculated
    stands.

    """
    if datalayer.type == DataLayerType.VECTOR:
        raise ValueError("Cannot calculate zonal stats for vector layers.")

    if datalayer.url is None:
        raise ValueError("Cannot calculate zonal stats for empty urls.")
    stand_ids = set(stands.all().values_list("id", flat=True))
    existing_metrics = StandMetric.objects.filter(
        stand_id__in=stand_ids,
        datalayer_id=datalayer.pk,
    )
    existing_stand_ids = set(existing_metrics.all().values_list("stand_id", flat=True))
    missing_stand_ids = stand_ids - existing_stand_ids
    missing_stands = Stand.objects.filter(id__in=missing_stand_ids).with_webmercator()
    if missing_stands.count() <= 0:
        log.info("There are no missing stands. Early return.")
        return StandMetric.objects.filter(
            stand__id__in=stands,
            datalayer_id=datalayer.pk,
        )

    stand_geojson = list(map(to_geojson, missing_stands))
    nodata = datalayer.info.get("nodata", 0) or 0 if datalayer.info else 0
    with rasterio.Env(**get_gdal_env()):
        if feature_enabled("RASTERIO_WINDOWED_READ"):
            with rasterio.open(datalayer.url) as main_raster:
                bounds = total_bounds([shape(f.get("geometry")) for f in stand_geojson])
                window = from_bounds(*bounds, transform=main_raster.transform)
                data = main_raster.read(1, window=window)
                window_transform = main_raster.window_transform(window)
                stats = zonal_stats(
                    raster=data,
                    affine=window_transform,
                    vectors=stand_geojson,
                    stats=aggregations,
                    nodata=nodata,
                    geojson_out=True,
                    band=1,
                )
        else:
            stats = zonal_stats(
                raster=datalayer.url,
                vectors=stand_geojson,
                stats=aggregations,
                nodata=nodata,
                geojson_out=True,
                band=1,
            )

    results = list(
        map(
            lambda r: to_stand_metric(
                stats_result=r,
                datalayer=datalayer,
                aggregations=aggregations,
            ),
            stats,
        )
    )
    StandMetric.objects.bulk_create(
        results,
        batch_size=100,
        update_conflicts=True,
        unique_fields=["stand_id", "datalayer_id"],
        update_fields="min avg max sum count majority minority".split(),
    )

    log.info(f"Created/Updated {len(results)} stand metrics.")

    return StandMetric.objects.filter(
        stand_id__in=stand_ids,
        datalayer=datalayer,
    )


def get_datalayer_metric(datalayer: DataLayer) -> str:
    if not datalayer.metadata:
        return "avg"
    metric = (
        datalayer.metadata.get("modules", {})
        .get("forsys", {})
        .get("metric_column", "avg")
    )
    if metric not in MODEL_AGGREGATION_MAP:
        return "avg"
    return metric


def get_stand_grid_key_search_precision(stand_size: StandSizeChoices) -> int:
    size_to_precision = {
        StandSizeChoices.SMALL: 4,
        StandSizeChoices.MEDIUM: 3,
        StandSizeChoices.LARGE: 2,
    }
    precision = size_to_precision.get(stand_size, 4)
    return precision
