import json
import logging
import tempfile
from collections import defaultdict
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple
from uuid import uuid4

import numpy as np
import rasterio
from datasets.models import (
    DataLayer,
    DataLayerHasStyle,
    DataLayerStatus,
    DataLayerType,
    StorageTypeChoices,
)
from datasets.services import geometry_from_info, get_storage_url
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.gis.geos import GEOSGeometry
from gis.core import fetch_geometry_type, get_layer_info, with_vsi_prefix
from gis.geometry import maybe_transform
from gis.io import detect_mimetype
from gis.rasters import to_cog_streaming
from planning.models import ProjectArea, Scenario
from planning.services import get_acreage
from pyproj import Geod
from rasterio.features import geometry_mask
from rasterio.mask import mask

from funding_report.models import (
    FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
    FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
    FUNDING_REPORT_YEARS,
    TREATMENT_NO_TREATMENT_LABEL,
    TREATMENT_PIXEL_VALUE_LABELS,
    TREATMENT_ROLE,
    TREATMENT_VARIABLE,
    FundingOpportunityReport,
    FundingReportMetric,
)

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


def get_treatment_datalayer() -> DataLayer | None:
    datalayers = list(
        DataLayer.objects.filter(
            type=DataLayerType.RASTER,
            metadata__contains={
                "modules": {
                    "funding_report": {
                        "variable": TREATMENT_VARIABLE,
                        "role": TREATMENT_ROLE,
                    }
                }
            },
        )[:2]
    )
    if not datalayers:
        log.warning("Missing funding report treatment datalayer.")
        return None
    if len(datalayers) > 1:
        log.warning("Multiple funding report treatment datalayers found.")
        return None
    return datalayers[0]


def get_project_areas_union(scenario: Scenario) -> GEOSGeometry:
    geometry = scenario.project_areas.aggregate(geometry=UnionOp("geometry"))[
        "geometry"
    ]
    if geometry is None:
        raise ValueError(
            f"Scenario {scenario.pk} has no project areas to union for the "
            "treatment datalayer clip."
        )
    return geometry


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


def aggregate_flame_length_reduction(
    baseline_pixels: np.ma.MaskedArray,
    value_pixels: np.ma.MaskedArray,
    src: rasterio.DatasetReader,
    transform,
    project_area: ProjectArea,
    from_ft: float,
    to_ft: float,
) -> Dict[str, Any]:
    valid_mask = _valid_pixel_mask(baseline_pixels, value_pixels)
    baseline_values = baseline_pixels.filled(np.nan)
    value_values = value_pixels.filled(np.nan)
    reduced_mask = valid_mask & (baseline_values >= from_ft) & (value_values <= to_ft)

    reduced_area_acres = _selected_pixel_area_acres(reduced_mask, src, transform)
    project_area_acres = get_acreage(project_area.geometry)
    percent_area_reduced = (
        reduced_area_acres / project_area_acres * 100 if project_area_acres else 0.0
    )
    return {
        "value": reduced_area_acres,
        "baseline": project_area_acres,
        "delta": percent_area_reduced,
        "interval": {"from": from_ft, "to": to_ft},
    }


def calculate_project_area_delta(
    project_area: ProjectArea,
    metric: str,
    year: int,
    datalayer_lookup: Dict[Tuple[str, int, bool], DataLayer] | None = None,
    from_ft: float = FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
    to_ft: float = FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
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
            baseline_data, baseline_transform = mask(
                baseline_src, [geometry], crop=True, filled=False
            )
            value_data, _value_transform = mask(
                value_src, [geometry], crop=True, filled=False
            )

        baseline_pixels = baseline_data[0]
        value_pixels = value_data[0]
        if metric == FundingReportMetric.TOTAL_FLAME_SEVERITY:
            aggregates = aggregate_flame_length_reduction(
                baseline_pixels=baseline_pixels,
                value_pixels=value_pixels,
                src=baseline_src,
                transform=baseline_transform,
                project_area=project_area,
                from_ft=from_ft,
                to_ft=to_ft,
            )
        else:
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


def generate_treatment_clip_datalayer(report: FundingOpportunityReport) -> DataLayer:
    from datasets.tasks import datalayer_uploaded

    source = get_treatment_datalayer()
    if source is None:
        raise ValueError("Missing funding report treatment datalayer.")

    report = FundingOpportunityReport.objects.select_related("scenario").get(
        pk=report.pk
    )
    scenario = report.scenario
    geometry = get_project_areas_union(scenario)

    with rasterio.open(_datalayer_path(source)) as src:
        raster_srid = src.crs.to_epsg() if src.crs else None
        if raster_srid is None:
            raise ValueError(f"Raster CRS {src.crs} does not resolve to an EPSG SRID.")
        clip_geometry = json.loads(maybe_transform(geometry, raster_srid).geojson)
        data, transform = mask(src, [clip_geometry], crop=True)

        profile = src.profile.copy()
        profile.update(
            {
                "height": data.shape[1],
                "width": data.shape[2],
                "transform": transform,
            }
        )

        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
            clipped_path = tmp.name
        with rasterio.open(clipped_path, "w", **profile) as dst:
            dst.write(data)

    try:
        organization = source.organization
        uuid_value = str(uuid4())
        original_name = f"funding_report_treatments_scenario_{scenario.pk}.tif"
        storage_url = get_storage_url(
            organization_id=organization.pk,
            uuid=uuid_value,
            original_name=original_name,
            mimetype="image/tiff",
        )
        to_cog_streaming(input_file=clipped_path, output_file=storage_url)
    finally:
        Path(clipped_path).unlink(missing_ok=True)

    vsi_output = with_vsi_prefix(storage_url)
    layer_type, layer_info = get_layer_info(input_file=vsi_output)
    mimetype = detect_mimetype(input_file=vsi_output) or "image/tiff"
    geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)

    style_associations = [
        (association.style_id, association.default)
        for association in source.rel_styles.all()
    ]

    user_model = get_user_model()
    created_by = user_model.objects.get(email=settings.DEFAULT_ADMIN_EMAIL)

    name = f"Funding Report Treatments - Scenario {scenario.pk}"
    DataLayer.dead_or_alive.filter(dataset=source.dataset, name=name).delete()

    datalayer = DataLayer.objects.create(
        name=name,
        uuid=uuid_value,
        dataset=source.dataset,
        category=source.category,
        organization=organization,
        workspace=source.workspace,
        created_by=created_by,
        original_name=original_name,
        url=storage_url,
        type=layer_type,
        storage_type=StorageTypeChoices.DATABASE,
        geometry_type=geometry_type,
        geometry=geometry_from_info(layer_info, datalayer_type=layer_type),
        info=layer_info,
        mimetype=mimetype,
        metadata=deepcopy(source.metadata) or {},
        map_service_type=source.map_service_type,
        status=DataLayerStatus.PENDING,
    )
    DataLayerHasStyle.objects.bulk_create(
        [
            DataLayerHasStyle(
                datalayer=datalayer,
                style_id=style_id,
                default=default,
            )
            for style_id, default in style_associations
        ]
    )

    datalayer_uploaded.delay(datalayer.pk, status=DataLayerStatus.READY)
    return datalayer


def calculate_treatment_pixel_areas(report: FundingOpportunityReport) -> Dict[str, Any]:
    source = get_treatment_datalayer()
    if source is None:
        raise ValueError("Missing funding report treatment datalayer.")

    report = FundingOpportunityReport.objects.select_related("scenario").get(
        pk=report.pk
    )
    project_areas = list(report.scenario.project_areas.all())

    projects: Dict[int, Dict[str, float]] = {}
    total: Dict[str, float] = defaultdict(float)

    with rasterio.open(_datalayer_path(source)) as src:
        raster_srid = src.crs.to_epsg() if src.crs else None
        if raster_srid is None:
            raise ValueError(f"Raster CRS {src.crs} does not resolve to an EPSG SRID.")

        for project_area in project_areas:
            geometry = json.loads(
                maybe_transform(project_area.geometry, raster_srid).geojson
            )
            try:
                data, transform = mask(src, [geometry], crop=True, filled=False)
            except ValueError:
                projects[project_area.pk] = {}
                continue

            pixels = data[0]
            data_mask = np.ma.getmaskarray(pixels)
            valid_mask = ~data_mask
            values = np.ma.array(pixels, mask=~valid_mask).compressed()

            inside_geometry = ~geometry_mask(
                [geometry],
                out_shape=pixels.shape,
                transform=transform,
                invert=False,
            )

            project_result: Dict[str, float] = {}
            for value in np.unique(values):
                selected_pixels = valid_mask & (pixels.filled(np.nan) == value)
                acres = _selected_pixel_area_acres(
                    selected_pixels=selected_pixels,
                    src=src,
                    transform=transform,
                )
                label = TREATMENT_PIXEL_VALUE_LABELS.get(int(value), str(int(value)))
                project_result[label] = acres
                total[label] += acres

            no_treatment_pixels = inside_geometry & data_mask
            if no_treatment_pixels.any():
                acres = _selected_pixel_area_acres(
                    selected_pixels=no_treatment_pixels,
                    src=src,
                    transform=transform,
                )
                project_result[TREATMENT_NO_TREATMENT_LABEL] = acres
                total[TREATMENT_NO_TREATMENT_LABEL] += acres

            projects[project_area.pk] = project_result

    return {
        "projects": projects,
        "total": dict(total),
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

    for (metric, _year), summary in summary_values.items():
        if summary["value"] is None or summary["baseline"] is None:
            continue
        if metric == FundingReportMetric.TOTAL_FLAME_SEVERITY:
            summary["delta"] = (
                summary["value"] / summary["baseline"] * 100
                if summary["baseline"]
                else 0.0
            )
        else:
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


def calculate_funding_report_flame_length_reduction(
    report: FundingOpportunityReport,
    from_ft: float,
    to_ft: float,
) -> Dict[str, Any]:
    report = FundingOpportunityReport.objects.select_related("scenario").get(
        pk=report.pk
    )
    project_areas = list(report.scenario.project_areas.all())
    datalayer_lookup = build_datalayer_lookup()

    results = [
        calculate_project_area_delta(
            project_area=project_area,
            metric=FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
            year=year,
            datalayer_lookup=datalayer_lookup,
            from_ft=from_ft,
            to_ft=to_ft,
        )
        for project_area in project_areas
        for year in FUNDING_REPORT_YEARS
    ]

    built = build_funding_report_results(results)
    return {
        "interval": {"from": from_ft, "to": to_ft},
        "summary": built["summary"].get(
            FundingReportMetric.TOTAL_FLAME_SEVERITY.value, []
        ),
        "projects": built["projects"].get(
            FundingReportMetric.TOTAL_FLAME_SEVERITY.value, []
        ),
    }
