import json
import logging
from typing import Any, Collection, Dict

import rasterio
import requests
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


def from_api_to_metric(
    data: Dict[str, Any], datalayer: DataLayer, aggregations: Collection[str]
) -> StandMetric:
    stand_id = data.pop("stand_id")
    datalayer_id = datalayer.pk
    stand_metric_data = {
        AGGREGATION_MODEL_MAP[agg]: data.get(agg) for agg in aggregations
    }
    return StandMetric(
        stand_id=stand_id, datalayer_id=datalayer_id, **stand_metric_data
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
    grid_key_start: str,
):
    stands = (
        Stand.objects.all()
        .within_polygon(planning_area_geometry, stand_size)
        .filter(size=stand_size, grid_key__icontains=grid_key_start)
    )
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
            [tuple(missing_stand_ids), datalayer.pk],
        )


def calculate_stand_vector_stats_with_stand_list(
    stand_ids: list[int],
    datalayer: DataLayer,
):
    if len(stand_ids) <= 0:
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
            [tuple(stand_ids), datalayer.pk],
        )


def calculate_stand_zonal_stats_api(
    stands: QuerySet["Stand"],
    datalayer: DataLayer,
    aggregations: Collection[str] = DEFAULT_AGGREGATIONS,
) -> None:
    """ "This function calculates zonal stats for
    a collection of stands using an external API.
    This function DOES NOT skip recalculating metrics
    for already calculated stands.
    """
    if datalayer.type == DataLayerType.VECTOR:
        raise ValueError("Cannot calculate zonal stats for vector layers.")

    if datalayer.url is None:
        raise ValueError("Cannot calculate zonal stats for empty urls.")

    stands = stands.with_webmercator()
    if stands.count() <= 0:
        log.info("There are no missing stands. Early return.")
        return

    stand_geojson = list(map(to_geojson, stands))
    nodata = datalayer.info.get("nodata", 0) or 0 if datalayer.info else 0
    payload = {
        "datalayer": {
            "id": datalayer.pk,
            "url": datalayer.url,
            "nodata": nodata,
        },
        "stands": {"type": "FeatureCollection", "features": stand_geojson},
        "env": settings.ENV,
    }
    response = requests.post(f"{settings.STAND_METRICS_API_URL}/metrics", json=payload)
    response.raise_for_status()

    data = response.json()
    results = list(
        map(
            lambda r: from_api_to_metric(
                data=r,
                datalayer=datalayer,
                aggregations=aggregations,
            ),
            data,
        )
    )
    StandMetric.objects.bulk_create(
        results,
        batch_size=100,
        update_conflicts=True,
        unique_fields=["stand_id", "datalayer_id"],
        update_fields="min avg median max sum count majority minority".split(),
    )

    log.info(f"Created/Updated {len(results)} stand metrics.")


def calculate_stand_zonal_stats(
    stands: QuerySet["Stand"],
    datalayer: DataLayer,
    aggregations: Collection[str] = DEFAULT_AGGREGATIONS,
) -> None:
    """This function calculates zonal stats for
    a collection of stands. This function skips
    recalculating metrics for already calculated
    stands.

    """
    if datalayer.type == DataLayerType.VECTOR:
        raise ValueError("Cannot calculate zonal stats for vector layers.")

    if datalayer.url is None:
        raise ValueError("Cannot calculate zonal stats for empty urls.")

    missing_stands = stands.with_webmercator()
    stand_geojson = list(map(to_geojson, missing_stands))
    nodata = datalayer.info.get("nodata", 0) or 0 if datalayer.info else 0
    with rasterio.Env(**get_gdal_env()):
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
        update_fields="min avg median max sum count majority minority".split(),
    )

    log.info(f"Created/Updated {len(results)} stand metrics.")


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
        StandSizeChoices.SMALL: 5,
        StandSizeChoices.MEDIUM: 4,
        StandSizeChoices.LARGE: 3,
    }
    precision = size_to_precision.get(stand_size, 5)
    return precision


def get_missing_stand_ids_for_datalayer_within_geometry(
    geometry: GEOSGeometry,
    stand_size: StandSizeChoices,
    datalayer: DataLayer,
) -> set[int]:
    """
    Given a geometry, stand size and datalayer, return the set of stand IDs
    that are within the geometry and of the given size, but do not have a metric
    for the given datalayer.
    """

    query = """
    SELECT s.id FROM stands_stand s
    LEFT OUTER JOIN stands_standmetric sm
    ON s.id = sm.stand_id AND sm.datalayer_id = %s
    WHERE
        s.size = %s AND
        s.geometry && ST_GeomFromText(%s, %s) AND
        ST_Within(ST_Centroid(s.geometry), ST_GeomFromText(%s, %s))
        AND sm.id IS NULL
        ORDER BY s.grid_key;
    """
    with connection.cursor() as cursor:
        cursor.execute(
            query,
            [
                datalayer.pk,
                stand_size,
                geometry.wkt,
                settings.DEFAULT_CRS,
                geometry.wkt,
                settings.DEFAULT_CRS,
            ],
        )
        rows = cursor.fetchall()
        missing_stand_ids = {row[0] for row in rows}
        return missing_stand_ids


def get_missing_stand_ids_for_datalayer_from_stand_list(
    stand_ids: list[int],
    datalayer: DataLayer,
) -> set[int]:
    """
    Given a set of Stand IDs and datalayer, return the set of stand IDs
    that do not have a metric for the given datalayer.
    """

    query = """
    SELECT s.id FROM stands_stand s
    LEFT OUTER JOIN stands_standmetric sm
    ON s.id = sm.stand_id AND sm.datalayer_id = %s
    WHERE
        s.id IN %s
        AND sm.id IS NULL
        ORDER BY s.grid_key;
    """
    with connection.cursor() as cursor:
        cursor.execute(
            query,
            [
                datalayer.pk,
                tuple(stand_ids),
            ],
        )
        rows = cursor.fetchall()
        missing_stand_ids = {row[0] for row in rows}
        return missing_stand_ids
