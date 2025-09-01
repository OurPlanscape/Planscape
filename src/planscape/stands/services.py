import json
import logging
from typing import Any, Collection, Dict

import rasterio
from core.flags import feature_enabled
from datasets.dynamic_models import model_from_fiona
from datasets.models import DataLayer, DataLayerType
from django.conf import settings
from django.contrib.gis.db.models import Collect
from django.contrib.gis.db.models.functions import Area, Intersection, Transform
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.measure import Area as A
from django.db import connection
from django.db.models import F, QuerySet, Value
from django.db.models.functions import Coalesce, NullIf
from gis.geometry import get_bounding_polygon
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
    "max",
    "sum",
    "count",
    "majority",
    "minority",
)

AGGREGATION_MODEL_MAP = {
    "min": "min",
    "mean": "avg",
    "max": "max",
    "sum": "sum",
    "count": "count",
    "majority": "majority",
    "minority": "minority",
}
MODEL_AGGREGATION_MAP = {value: key for key, value in AGGREGATION_MODEL_MAP.items()}


def calculate_stand_vector_stats(
    stands: QuerySet[Stand],
    datalayer: DataLayer,
    transform_srid: int = 5070,
):
    if datalayer.type == DataLayerType.RASTER:
        raise ValueError("Cannot calculate vector stats for raster layers.")

    stand_geom = "geometry"
    if transform_srid:
        stand_geom = Transform("geometry", transform_srid)

    bounding_poly = get_bounding_polygon(
        [s for s in stands.all().values_list("geometry", flat=True)]
    )
    Vector = model_from_fiona(datalayer)
    intersection_geometry = (
        Vector.objects.filter(geometry__intersects=bounding_poly)
        .annotate(area=Area(Transform("geometry", transform_srid)))
        .filter(area__gt=A(sq_m=0))
        .aggregate(collect=Collect("geometry"))["collect"]
    )
    if intersection_geometry and not intersection_geometry.empty:
        # tolerance in meters
        intersection_geometry = (
            intersection_geometry.transform(transform_srid, clone=True)
            .simplify(
                tolerance=settings.AVAILABLE_STANDS_SIMPLIFY_TOLERANCE,
                preserve_topology=True,
            )
            .buffer(0)
        )
        stands = (
            stands.annotate(stand_geometry=Transform("geometry", transform_srid))
            .annotate(stand_area=Area(stand_geom))
            .annotate(
                inter_area=Area(
                    Intersection(
                        stand_geom,
                        Value(
                            intersection_geometry,
                        ),
                    )
                )
            )
            .annotate(
                coverage=Coalesce(F("inter_area"), Value(0.0))
                / NullIf(F("stand_area"), 0.0)
            )
        )
    results = []
    for stand in stands:
        majority = getattr(stand, "coverage", 0)
        if majority > 0.5:
            majority = 1
        else:
            majority = 0
        stats_result = {"id": stand.pk, "properties": {"majority": majority}}

        stand_metric = to_stand_metric(
            stats_result=stats_result,
            datalayer=datalayer,
            aggregations=["majority"],
        )
        results.append(stand_metric)

    log.info(f"Created/Updated {len(results)} stand metrics.")
    return StandMetric.objects.bulk_create(
        results,
        batch_size=100,
        update_conflicts=True,
        unique_fields=["stand_id", "datalayer_id"],
        update_fields=["majority"],
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
        stand_id__in=stands,
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
