import json
import logging
from typing import Any, Dict, Iterable

from core.s3 import get_aws_session
from datasets.models import DataLayer, DataLayerType
from django.db.models import QuerySet
from rasterstats.io import Raster
from shapely import total_bounds
from shapely.geometry import shape
import rasterio
from rasterstats import zonal_stats
from rasterio.session import AWSSession

from stands.models import Stand, StandMetric

log = logging.getLogger(__name__)


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
    aggregations: Iterable[str],
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


def calculate_stand_zonal_stats(
    stands: QuerySet["Stand"],
    datalayer: DataLayer,
    aggregations: Iterable[str] = DEFAULT_AGGREGATIONS,
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
    missing_stands = stands.all().filter(id__in=missing_stand_ids)
    if missing_stands.count() <= 0:
        log.info("There are no missing stands. Early return.")
        return StandMetric.objects.filter(
            stand__id__in=stands,
            datalayer_id=datalayer.pk,
        )

    stand_geojson = list(map(to_geojson, missing_stands))
    bounds = total_bounds([shape(f.get("geometry")) for f in stand_geojson])
    nodata = datalayer.info.get("nodata", 0) or 0 if datalayer.info else 0
    rio_session = AWSSession(get_aws_session())
    with rasterio.Env(rio_session):
        with Raster(datalayer.url) as main_raster:
            subset = main_raster.read(bounds=list(bounds))
            stats = zonal_stats(
                raster=subset.array,
                affine=subset.affine,
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
                update_conflicts=True,
                unique_fields=["stand_id", "datalayer_id"],
                update_fields="min avg max sum count majority minority".split(),
            )

            log.info(f"Created/Updated {len(results)} stand metrics.")

        return StandMetric.objects.filter(
            stand_id__in=stand_ids,
            datalayer=datalayer,
        )
