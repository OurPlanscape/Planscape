import json
import logging
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np
import rasterio
from django.conf import settings
from datasets.models import DataLayer, DataLayerType
from gis.core import with_vsi_prefix
from gis.geometry import maybe_transform
from planning.models import ProjectArea
from planning.services import get_acreage
from pyproj import Geod
from rasterio.mask import mask

from funding_report.models import FundingOpportunityReport

log = logging.getLogger(__name__)

AET_VARIABLE = "AET"
AET_DELTA_ROLE = "delta"


def build_datalayer_lookup() -> Dict[Tuple[str, int, bool], DataLayer]:
    lookup = {}
    for datalayer in DataLayer.objects.filter(
        type=DataLayerType.RASTER,
        metadata__has_key="modules",
    ):
        fr_meta = (datalayer.metadata or {}).get("modules", {}).get("funding_report")
        if fr_meta is None:
            continue
        variable = fr_meta.get("variable")
        year = fr_meta.get("year")
        baseline = fr_meta.get("baseline")
        if variable is None or year is None or baseline is None:
            log.warning(
                "DataLayer %s has incomplete funding_report metadata: %s",
                datalayer.pk,
                fr_meta,
            )
            continue
        lookup[(variable, year, baseline)] = datalayer
    return lookup


def get_aet_delta_datalayer() -> DataLayer:
    datalayers = list(
        DataLayer.objects.filter(
            type=DataLayerType.RASTER,
            metadata__contains={
                "modules": {
                    "funding_report": {
                        "variable": AET_VARIABLE,
                        "role": AET_DELTA_ROLE,
                    }
                }
            },
        )[:2]
    )
    if not datalayers:
        raise ValueError("Missing funding report AET delta datalayer.")
    if len(datalayers) > 1:
        raise ValueError("Multiple funding report AET delta datalayers found.")
    return datalayers[0]


def _get_datalayer(
    datalayer_lookup: Dict[Tuple[str, int, bool], DataLayer],
    metric: str,
    year: int,
    baseline: bool,
) -> DataLayer:
    try:
        return datalayer_lookup[(metric, year, baseline)]
    except KeyError:
        raise ValueError(
            f"Missing funding report datalayer for variable={metric!r}, "
            f"year={year}, baseline={baseline}."
        )


def _datalayer_path(datalayer: DataLayer) -> str:
    if not datalayer.url:
        raise ValueError(f"Funding report datalayer {datalayer.pk} has no URL.")
    return with_vsi_prefix(datalayer.url)


def _projected_pixel_area_acres(src: rasterio.DatasetReader) -> float:
    transform = src.transform
    unit_factor = 1.0
    if src.crs and src.crs.is_projected:
        linear_units_factor = src.crs.linear_units_factor
        if isinstance(linear_units_factor, tuple):
            unit_factor = float(linear_units_factor[-1])
    pixel_area = abs(transform.a * transform.e) * unit_factor * unit_factor
    return pixel_area / settings.CONVERSION_SQM_ACRES


def _geographic_pixel_area_acres(transform, row: int) -> float:
    geod = Geod(ellps="WGS84")
    corners = [
        transform * (0, row),
        transform * (1, row),
        transform * (1, row + 1),
        transform * (0, row + 1),
    ]
    lons = [corner[0] for corner in corners]
    lats = [corner[1] for corner in corners]
    area_sq_meters, _perimeter = geod.polygon_area_perimeter(lons, lats)
    return abs(area_sq_meters) / settings.CONVERSION_SQM_ACRES


def _selected_pixel_area_acres(
    selected_pixels: np.ndarray,
    src: rasterio.DatasetReader,
    transform,
) -> float:
    if not selected_pixels.any():
        return 0.0
    if src.crs and src.crs.is_projected:
        return float(selected_pixels.sum()) * _projected_pixel_area_acres(src)
    if src.crs and src.crs.is_geographic:
        rows, counts = np.unique(np.where(selected_pixels)[0], return_counts=True)
        return sum(
            int(count) * _geographic_pixel_area_acres(transform, int(row))
            for row, count in zip(rows, counts)
        )
    raise ValueError("AET delta raster must use a projected or geographic CRS.")


def _valid_pixel_mask(
    baseline_pixels: np.ma.MaskedArray,
    value_pixels: np.ma.MaskedArray,
) -> np.ndarray:
    baseline_mask = np.ma.getmaskarray(baseline_pixels)
    value_mask = np.ma.getmaskarray(value_pixels)
    return (
        ~baseline_mask
        & ~value_mask
        & np.isfinite(baseline_pixels.filled(np.nan))
        & np.isfinite(value_pixels.filled(np.nan))
    )


def calculate_pixel_deltas(
    baseline_pixels: np.ma.MaskedArray,
    value_pixels: np.ma.MaskedArray,
) -> np.ma.MaskedArray:
    if baseline_pixels.shape != value_pixels.shape:
        raise ValueError(
            "Funding report baseline and value rasters are not aligned for "
            f"the project area clip: {baseline_pixels.shape} != {value_pixels.shape}."
        )

    valid_mask = _valid_pixel_mask(baseline_pixels, value_pixels)
    baseline_values = np.ma.array(baseline_pixels, mask=~valid_mask, dtype=float)
    value_values = np.ma.array(value_pixels, mask=~valid_mask, dtype=float)
    zero_mask = (baseline_values == 0) | (value_values == 0)
    with np.errstate(divide="ignore", invalid="ignore"):
        delta_pixels = np.ma.divide(value_values - baseline_values, baseline_values)
    return np.ma.where(zero_mask, 0, delta_pixels)


def aggregate_delta_pixels(delta_pixels: np.ma.MaskedArray) -> float | None:
    if delta_pixels.count() == 0:
        return None
    return float(delta_pixels.sum())


def calculate_percent_delta(value: float, baseline: float) -> float:
    if baseline == 0:
        return 0.0
    return (value - baseline) / baseline * 100


def aggregate_project_area_pixels(
    baseline_pixels: np.ma.MaskedArray,
    value_pixels: np.ma.MaskedArray,
) -> Dict[str, float | None]:
    valid_mask = _valid_pixel_mask(baseline_pixels, value_pixels)
    if not valid_mask.any():
        return {"value": None, "baseline": None, "delta": None}

    baseline_values = np.ma.array(baseline_pixels, mask=~valid_mask, dtype=float)
    value_values = np.ma.array(value_pixels, mask=~valid_mask, dtype=float)
    baseline_sum = float(baseline_values.sum())
    value_sum = float(value_values.sum())
    return {
        "value": value_sum,
        "baseline": baseline_sum,
        "delta": calculate_percent_delta(value_sum, baseline_sum),
    }


def calculate_project_area_delta(
    project_area: ProjectArea,
    metric: str,
    year: int,
    datalayer_lookup: Dict[Tuple[str, int, bool], DataLayer] | None = None,
) -> Dict[str, Any]:
    datalayer_lookup = datalayer_lookup or build_datalayer_lookup()
    baseline_layer = _get_datalayer(datalayer_lookup, metric, year, baseline=True)
    value_layer = _get_datalayer(datalayer_lookup, metric, year, baseline=False)

    with rasterio.open(_datalayer_path(baseline_layer)) as baseline_src:
        with rasterio.open(_datalayer_path(value_layer)) as value_src:
            if baseline_src.crs != value_src.crs:
                raise ValueError(
                    "Funding report baseline and value rasters must share the same CRS."
                )
            raster_srid = baseline_src.crs.to_epsg()
            if raster_srid is None:
                raise ValueError(
                    f"Raster CRS {baseline_src.crs} does not resolve to an EPSG SRID."
                )
            geometry = json.loads(
                maybe_transform(
                    project_area.geometry,
                    raster_srid,
                ).geojson
            )
            baseline_data, _baseline_transform = mask(
                baseline_src, [geometry], crop=True, filled=False
            )
            value_data, _value_transform = mask(
                value_src, [geometry], crop=True, filled=False
            )

    baseline_pixels = baseline_data[0]
    value_pixels = value_data[0]
    aggregates = aggregate_project_area_pixels(
        baseline_pixels=baseline_pixels,
        value_pixels=value_pixels,
    )
    return {
        "variable": metric,
        "project_id": project_area.pk,
        "proj_id": (project_area.data or {}).get("proj_id"),
        "year": year,
        **aggregates,
    }


def calculate_project_area_aet_improvement(
    project_area: ProjectArea,
    percentage: float,
    delta_src: rasterio.DatasetReader,
    raster_srid: int,
) -> float:
    geometry = json.loads(
        maybe_transform(
            project_area.geometry,
            raster_srid,
        ).geojson
    )
    try:
        delta_data, delta_transform = mask(
            delta_src, [geometry], crop=True, filled=False
        )
    except ValueError:
        # project area does not overlap the AET delta raster
        return 0.0

    delta_pixels = np.ma.array(delta_data[0], dtype=float)
    pixel_mask = np.ma.getmaskarray(delta_pixels)
    delta_values = delta_pixels.filled(np.nan)
    selected_pixels = (
        ~pixel_mask & np.isfinite(delta_values) & (delta_values >= percentage)
    )
    return _selected_pixel_area_acres(
        selected_pixels=selected_pixels,
        src=delta_src,
        transform=delta_transform,
    )


def calculate_aet_improvement(
    report: FundingOpportunityReport, percentage: float
) -> Dict[str, Any]:
    report = FundingOpportunityReport.objects.select_related("scenario").get(
        pk=report.pk
    )
    project_areas = list(report.scenario.project_areas.all())
    delta_layer = get_aet_delta_datalayer()

    with rasterio.open(_datalayer_path(delta_layer)) as delta_src:
        raster_srid = delta_src.crs.to_epsg() if delta_src.crs else None
        if raster_srid is None:
            raise ValueError(
                f"Raster CRS {delta_src.crs} does not resolve to an EPSG SRID."
            )

        project_area_results = []
        for project_area in project_areas:
            total_acres = get_acreage(project_area.geometry)
            improved_acres = calculate_project_area_aet_improvement(
                project_area=project_area,
                percentage=percentage,
                delta_src=delta_src,
                raster_srid=raster_srid,
            )
            improved_area_percent = (
                improved_acres / total_acres * 100 if total_acres else 0.0
            )
            project_area_results.append(
                {
                    "project_id": project_area.pk,
                    "improved_acres": improved_acres,
                    "total_acres": total_acres,
                    "improved_area_percent": improved_area_percent,
                }
            )

    total_project_area_acres = sum(
        result["total_acres"] for result in project_area_results
    )
    improved_acres = sum(result["improved_acres"] for result in project_area_results)
    improved_area_percent = (
        improved_acres / total_project_area_acres * 100
        if total_project_area_acres
        else 0.0
    )

    return {
        "percentage": percentage,
        "improved_acres": improved_acres,
        "total_project_area_acres": total_project_area_acres,
        "improved_area_percent": improved_area_percent,
        "project_areas": project_area_results,
    }


def build_funding_report_results(
    project_results: Iterable[Dict[str, Any]],
) -> Dict[str, Any]:
    projects: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    summary_values: Dict[Tuple[str, int], Dict[str, Any]] = {}

    for result in project_results:
        metric = result["variable"]
        year = result["year"]
        project_result = {
            "project_id": result["project_id"],
            "proj_id": result.get("proj_id"),
            "year": year,
            "value": result["value"],
            "baseline": result["baseline"],
            "delta": result["delta"],
        }
        projects[metric].append(project_result)

        summary = summary_values.setdefault(
            (metric, year),
            {"year": year, "value": None, "baseline": None, "delta": None},
        )
        for field in ("value", "baseline"):
            if result[field] is None:
                continue
            summary[field] = (summary[field] or 0) + result[field]

    for summary in summary_values.values():
        if summary["value"] is None or summary["baseline"] is None:
            continue
        summary["delta"] = calculate_percent_delta(
            summary["value"], summary["baseline"]
        )

    summary_by_metric: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for (metric, _year), summary in summary_values.items():
        summary_by_metric[metric].append(summary)

    return {
        "summary": {
            metric: sorted(values, key=lambda item: item["year"])
            for metric, values in summary_by_metric.items()
        },
        "projects": {
            metric: sorted(
                values,
                key=lambda item: (item["year"], item["project_id"]),
            )
            for metric, values in projects.items()
        },
    }
