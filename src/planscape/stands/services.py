import json
import logging
from stands.models import Stand, StandMetric
from datasets.models import DataLayer, DataLayerType
from django.db.models import QuerySet
from typing import Any, Dict, List
from gis.rasters import get_zonal_stats

log = logging.getLogger(__name__)


def to_geojson(stand: Stand) -> Dict[str, Any]:
    geometry = stand.geometry.transform(3857, clone=True)
    return {
        "type": "Feature",
        "id": stand.id,
        "properties": {
            "id": stand.id,
            "size": stand.size,
        },
        "geometry": json.loads(geometry.json),
    }


def to_stand_metric(
    stats_result: Dict[str, Any],
    datalayer: DataLayer,
    aggregations: List[str],
) -> StandMetric:
    properties = stats_result.get("properties", {}) or {}
    stand_metric_data = {
        AGGREGATION_MODEL_MAP[agg]: properties.get(agg) for agg in aggregations
    }
    stand_metric, _created = StandMetric.objects.update_or_create(
        stand_id=stats_result.get("id"),
        datalayer_id=datalayer.pk,
        defaults=stand_metric_data,
    )
    return stand_metric


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


def calculate_stand_zonal_stats(
    stands: QuerySet["Stand"],
    datalayer: DataLayer,
    aggregations: List[str] = DEFAULT_METRICS,
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
    nodata = datalayer.info.get("nodata", 0) or 0 if datalayer.info else 0
    stats = get_zonal_stats(
        input_raster=datalayer.url,
        features=stand_geojson,
        aggregations=aggregations,
        nodata=nodata,
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

    log.info(f"Created {len(results)} stand metrics.")

    result_queryset = (
        StandMetric.objects.filter(
            stand_id__in=missing_stand_ids,
            datalayer=datalayer,
        )
        | existing_metrics
    )
    return result_queryset
