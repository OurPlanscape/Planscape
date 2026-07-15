import json
import logging
import re
import tempfile
from collections import defaultdict
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import uuid4

import fiona
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
from fiona.crs import from_epsg
from gis.core import fetch_geometry_type, get_layer_info, with_vsi_prefix
from gis.geometry import maybe_transform
from gis.info import get_gdal_env
from gis.io import detect_mimetype
from gis.rasters import to_cog_streaming
from planning.models import GeoPackageStatus, ProjectArea, Scenario
from planning.services import get_acreage, map_property_for_numeric_export
from pyproj import Geod, Transformer
from rasterio.features import geometry_mask
from rasterio.mask import mask
from utils.geometry import to_multi

from funding_report.models import (
    BIOMASS_VARIABLE,
    FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
    FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
    FUNDING_REPORT_LAYER_CATEGORIES,
    FUNDING_REPORT_YEARS,
    TREATMENT_NO_TREATMENT_LABEL,
    TREATMENT_PIXEL_VALUE_LABELS,
    TREATMENT_CLIP_ROLE,
    TREATMENT_ROLE,
    WOOD_TYPE_HARDWOOD,
    WOOD_TYPE_MIXED,
    WOOD_TYPE_SOFTWOOD,
    BiomassRole,
    TREATMENT_VARIABLE,
    FundingOpportunityReport,
    FundingReportLayerCategory,
    FundingReportLayerKey,
    FundingReportMetric,
)

log = logging.getLogger(__name__)

AET_VARIABLE = "AET"
AET_DELTA_ROLE = "delta"
AET_BASELINE_ROLE = "baseline"
AET_TARGET_ROLE = "target"
AET_PERCENTUAL_ROLE = "percentual"
AET_PERCENTUAL_CLIP_ROLE = "percentual_clip"


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


def _get_aet_role_datalayer(role: str) -> DataLayer | None:
    datalayers = list(
        DataLayer.objects.filter(
            type=DataLayerType.RASTER,
            metadata__contains={
                "modules": {
                    "funding_report": {
                        "variable": AET_VARIABLE,
                        "role": role,
                    }
                }
            },
        )[:2]
    )
    if not datalayers:
        log.warning("Missing funding report AET %s datalayer.", role)
        return None
    if len(datalayers) > 1:
        log.warning("Multiple funding report AET %s datalayers found.", role)
        return None
    return datalayers[0]


def get_aet_baseline_datalayer() -> DataLayer | None:
    return _get_aet_role_datalayer(AET_BASELINE_ROLE)


def get_aet_target_datalayer() -> DataLayer | None:
    return _get_aet_role_datalayer(AET_TARGET_ROLE)


def get_aet_percentual_datalayer() -> DataLayer | None:
    return _get_aet_role_datalayer(AET_PERCENTUAL_ROLE)


def get_mills_datalayers() -> List[DataLayer]:
    return list(
        DataLayer.objects.filter(dataset__name=settings.FORISK_MILLS_DATASET_NAME)
    )


def get_funding_report_layers_of_interest() -> Dict[str, List[DataLayer]]:
    lookup = build_datalayer_lookup()

    def _as_list(datalayer: DataLayer | None) -> List[DataLayer]:
        return [datalayer] if datalayer else []

    layers_by_key = {
        FundingReportLayerKey.BASELINE_ABOVEGROUND_CARBON_2026: _as_list(
            lookup.get((FundingReportMetric.ABOVEGROUND_TOTAL.value, 2026, True))
        ),
        FundingReportLayerKey.BASELINE_SMOKE_PRODUCTION_2026: _as_list(
            lookup.get((FundingReportMetric.POTENTIAL_SMOKE.value, 2026, True))
        ),
        FundingReportLayerKey.BASELINE_FLAME_LENGTH_2026: _as_list(
            lookup.get((FundingReportMetric.TOTAL_FLAME_SEVERITY.value, 2026, True))
        ),
        FundingReportLayerKey.AET_PERCENTUAL_CHANGE: _as_list(
            get_aet_percentual_datalayer()
        ),
        FundingReportLayerKey.MILLS_AND_OTHER_BIOMASS_FACILITIES: get_mills_datalayers(),
    }

    grouped: Dict[str, List[DataLayer]] = {
        category.value: [] for category in FundingReportLayerCategory
    }
    for layer_key, datalayers in layers_by_key.items():
        category = FUNDING_REPORT_LAYER_CATEGORIES[layer_key]
        grouped[category.value].extend(datalayers)
    return grouped


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


def _pixel_area_acres(
    transform,
    row: int,
    to_lonlat: Transformer | None,
) -> float:
    """
    Geodesic ground area (in acres) of one raster pixel in row `row`. Pixel
    corners are read straight from the raster's own transform - whatever its
    native resolution actually is - then converted to lon/lat (if not already
    geographic) so the area reflects true ground distance. This matters for
    CRSs like EPSG:3857 (Web Mercator), which is conformal but not
    equal-area: its scale factor grows with latitude, so treating its
    "meters" as ground meters silently inflates area away from the equator.
    """
    corners = [
        transform * (0, row),
        transform * (1, row),
        transform * (1, row + 1),
        transform * (0, row + 1),
    ]
    if to_lonlat is not None:
        corners = [to_lonlat.transform(x, y) for x, y in corners]
    lons = [corner[0] for corner in corners]
    lats = [corner[1] for corner in corners]
    geod = Geod(ellps="WGS84")
    area_sq_meters, _perimeter = geod.polygon_area_perimeter(lons, lats)
    return abs(area_sq_meters) / settings.CONVERSION_SQM_ACRES


def _selected_pixel_area_acres(
    selected_pixels: np.ndarray,
    src: rasterio.DatasetReader,
    transform,
) -> float:
    if not selected_pixels.any():
        return 0.0
    to_lonlat = (
        None
        if src.crs and src.crs.is_geographic
        else Transformer.from_crs(src.crs, "EPSG:4326", always_xy=True)
    )
    rows, counts = np.unique(np.where(selected_pixels)[0], return_counts=True)
    return sum(
        int(count) * _pixel_area_acres(transform, int(row), to_lonlat)
        for row, count in zip(rows, counts)
    )


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
    percentual_layer = get_aet_percentual_datalayer()
    if percentual_layer is None:
        raise ValueError("Missing funding report AET percentual datalayer.")

    with rasterio.open(_datalayer_path(percentual_layer)) as delta_src:
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


def _clip_metadata(source_metadata: dict | None, role: str) -> dict:
    metadata = deepcopy(source_metadata) or {}
    try:
        metadata["modules"]["funding_report"]["role"] = role
    except KeyError:
        pass
    return metadata


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
        metadata=_clip_metadata(source.metadata, TREATMENT_CLIP_ROLE),
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


def generate_aet_clip_datalayer(report: FundingOpportunityReport) -> DataLayer:
    from datasets.tasks import datalayer_uploaded

    source = get_aet_percentual_datalayer()
    if source is None:
        raise ValueError("Missing funding report AET percentual datalayer.")

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
        original_name = f"funding_report_aet_percentual_scenario_{scenario.pk}.tif"
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

    name = f"Funding Report AET Percentual - Scenario {scenario.pk}"
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
        metadata=_clip_metadata(source.metadata, AET_PERCENTUAL_CLIP_ROLE),
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


def build_flame_length_reduction_results(
    project_results: Iterable[Dict[str, Any]],
) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
    """
    Like build_funding_report_results, but buckets entries by their flame
    length "interval" (e.g. "7_4") instead of by metric, since a single
    funding report run now calculates flame length reduction for multiple
    intervals. Each result must carry an "interval": {"from": ..., "to": ...}
    key, as produced by aggregate_flame_length_reduction.
    """
    projects: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    summary_values: Dict[Tuple[str, int], Dict[str, Any]] = {}

    for result in project_results:
        interval = result["interval"]
        interval_key = f"{int(interval['from'])}_{int(interval['to'])}"
        year = result["year"]
        project_result = {
            "project_id": result["project_id"],
            "proj_id": result.get("proj_id"),
            "year": year,
            "value": result["value"],
            "baseline": result["baseline"],
            "delta": result["delta"],
            "raw_value": result["value"],
            "total_area": result["baseline"],
        }
        projects[interval_key].append(project_result)

        summary = summary_values.setdefault(
            (interval_key, year),
            {
                "year": year,
                "value": None,
                "baseline": None,
                "delta": None,
                "raw_value": None,
                "total_area": None,
            },
        )
        for field in ("value", "baseline"):
            if result[field] is None:
                continue
            summary[field] = (summary[field] or 0) + result[field]

    for (_interval_key, _year), summary in summary_values.items():
        if summary["value"] is None or summary["baseline"] is None:
            continue
        summary["delta"] = (
            summary["value"] / summary["baseline"] * 100
            if summary["baseline"]
            else 0.0
        )
        summary["raw_value"] = summary["value"]
        summary["total_area"] = summary["baseline"]

    summary_by_interval: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for (interval_key, _year), summary in summary_values.items():
        summary_by_interval[interval_key].append(summary)

    return {
        "summary": {
            interval_key: sorted(values, key=lambda item: item["year"])
            for interval_key, values in summary_by_interval.items()
        },
        "projects": {
            interval_key: sorted(
                values,
                key=lambda item: (item["year"], item["project_id"]),
            )
            for interval_key, values in projects.items()
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


_BIOMASS_WOOD_TYPES: Dict[int, str] = {
    WOOD_TYPE_SOFTWOOD: "softwood",
    WOOD_TYPE_HARDWOOD: "hardwood",
    WOOD_TYPE_MIXED: "mixed",
}

# Acres represented by one biomass raster pixel (~30 m x 30 m). The merch/
# non-merch rasters store per-acre values, so summed pixel values must be
# multiplied by this to turn a per-acre rate into a total.
_BIOMASS_PIXEL_AREA_ACRES = 0.2224


def get_biomass_datalayer(role: str) -> DataLayer:
    datalayers = list(
        DataLayer.objects.filter(
            type=DataLayerType.RASTER,
            metadata__contains={
                "modules": {
                    "funding_report": {
                        "variable": BIOMASS_VARIABLE,
                        "role": role,
                    }
                }
            },
        )[:2]
    )
    if not datalayers:
        raise ValueError(
            f"Missing funding report biomass datalayer with role={role!r}."
        )
    if len(datalayers) > 1:
        raise ValueError(
            f"Multiple funding report biomass datalayers found with role={role!r}."
        )
    return datalayers[0]


def _extract_raw_biomass_volumes(
    geometry: Dict[str, Any],
    merch_src: rasterio.DatasetReader,
    non_merch_src: rasterio.DatasetReader,
    wood_type_src: rasterio.DatasetReader,
) -> Dict[str, float]:
    """
    Sums raster pixel values per wood type for one project area geometry.
    Keys: merch_{softwood,hardwood,mixed}_bf_ac and nm_{softwood,hardwood,mixed}_cuft_ac.

    Raster pixels are already in per-acre output units (merch in bf/ac,
    non-merch in cuft/ac), so values are summed directly here with no area
    conversion. The per-acre sums are converted to totals downstream in
    `_biomass_volumes_to_output()`.
    """
    empty: Dict[str, float] = {}
    for name in _BIOMASS_WOOD_TYPES.values():
        empty[f"merch_{name}_bf_ac"] = 0.0
        empty[f"nm_{name}_cuft_ac"] = 0.0

    try:
        merch_data, _ = mask(merch_src, [geometry], crop=True, filled=False)
        non_merch_data, _ = mask(non_merch_src, [geometry], crop=True, filled=False)
        wt_data, _ = mask(wood_type_src, [geometry], crop=True, filled=False)
    except ValueError:
        return empty

    merch_arr = np.ma.array(merch_data[0], dtype=float)
    non_merch_arr = np.ma.array(non_merch_data[0], dtype=float)
    wt_arr = np.ma.array(wt_data[0])

    wt_nodata = np.ma.getmaskarray(wt_arr)
    wt_raw = wt_arr.filled(0)
    merch_ok = ~np.ma.getmaskarray(merch_arr) & np.isfinite(merch_arr.filled(np.nan))
    nm_ok = ~np.ma.getmaskarray(non_merch_arr) & np.isfinite(
        non_merch_arr.filled(np.nan)
    )
    merch_vals = merch_arr.filled(0.0)
    nm_vals = non_merch_arr.filled(0.0)

    result: Dict[str, float] = {}
    for wt_value, wt_name in _BIOMASS_WOOD_TYPES.items():
        wt_match = ~wt_nodata & (wt_raw == wt_value)
        result[f"merch_{wt_name}_bf_ac"] = float(merch_vals[wt_match & merch_ok].sum())
        result[f"nm_{wt_name}_cuft_ac"] = float(nm_vals[wt_match & nm_ok].sum())

    return result


def _biomass_volumes_to_output(raw: Dict[str, float]) -> Dict[str, float]:
    """
    Converts raw per-acre pixel sums into totals by multiplying by the
    per-pixel acreage, and maps them to their output field names.
    """
    result: Dict[str, float] = {}
    for wt_name in _BIOMASS_WOOD_TYPES.values():
        merch_bf_ac = raw.get(f"merch_{wt_name}_bf_ac", 0.0)
        nm_cuft_ac = raw.get(f"nm_{wt_name}_cuft_ac", 0.0)
        result[f"merchantable_{wt_name}_bf"] = merch_bf_ac * _BIOMASS_PIXEL_AREA_ACRES
        result[f"non_merchantable_{wt_name}_cuft"] = nm_cuft_ac * _BIOMASS_PIXEL_AREA_ACRES
    return result


def calculate_biomass_volumes(report: FundingOpportunityReport) -> Dict[str, Any]:
    report = FundingOpportunityReport.objects.select_related("scenario").get(
        pk=report.pk
    )
    project_areas = list(report.scenario.project_areas.all())

    merch_layer = get_biomass_datalayer(BiomassRole.MERCHANTABLE)
    non_merch_layer = get_biomass_datalayer(BiomassRole.NON_MERCHANTABLE)
    wt_layer = get_biomass_datalayer(BiomassRole.WOOD_TYPE)

    with (
        rasterio.open(_datalayer_path(merch_layer)) as merch_src,
        rasterio.open(_datalayer_path(non_merch_layer)) as non_merch_src,
        rasterio.open(_datalayer_path(wt_layer)) as wt_src,
    ):
        raster_srid = merch_src.crs.to_epsg() if merch_src.crs else None
        if raster_srid is None:
            raise ValueError(
                f"Biomass raster CRS {merch_src.crs} does not resolve to an EPSG SRID."
            )

        accumulated: Dict[str, float] = {
            f"merch_{wt_name}_bf_ac": 0.0 for wt_name in _BIOMASS_WOOD_TYPES.values()
        } | {
            f"nm_{wt_name}_cuft_ac": 0.0 for wt_name in _BIOMASS_WOOD_TYPES.values()
        }

        project_area_results = []
        for project_area in project_areas:
            geometry = json.loads(
                maybe_transform(project_area.geometry, raster_srid).geojson
            )
            raw = _extract_raw_biomass_volumes(geometry, merch_src, non_merch_src, wt_src)

            project_area_results.append(
                {
                    "project_id": project_area.pk,
                    "proj_id": (project_area.data or {}).get("proj_id"),
                    **_biomass_volumes_to_output(raw),
                }
            )

            for key in accumulated:
                accumulated[key] += raw.get(key, 0.0)

    return {
        "summary": _biomass_volumes_to_output(accumulated),
        "project_areas": project_area_results,
    }


_INVALID_COLUMN_CHARS = re.compile(r"[^0-9a-zA-Z_]+")


def _sanitize_column_name(name: str) -> str:
    """
    Replaces characters that aren't safe in a GeoPackage/SQL column name
    with underscores, preserving case. Unlike `sanitize_shp_field_name`
    (Django's `slugify`), this does not lowercase or use hyphens - hyphens
    aren't valid in an unquoted SQL identifier, and lowercasing would
    obscure the metric names (e.g. "ABOVEGROUND_TOTAL_2026_value").
    """
    return _INVALID_COLUMN_CHARS.sub("_", str(name)).strip("_")


def flatten_report_metrics(prefix: str, value: Any, out: Dict[str, Any]) -> None:
    """
    Flattens the nested `results["summary"]`/`results["projects"]` structure
    into a flat dict of columns suitable for a GeoPackage attribute table.

    - dicts recurse, appending the key to the prefix (e.g. "AET" + "percentage"
      -> "AET_percentage").
    - lists of dicts (one row per year, or per project per year) recurse per
      item, appending the item's "year" to the prefix when present (e.g.
      "ABOVEGROUND_TOTAL" + year 2026 -> "ABOVEGROUND_TOTAL_2026"). The
      "project_id"/"proj_id"/"year" keys are dropped from the item itself
      since they're identifying metadata, not a result column.
    - anything else is a leaf value, written under the sanitized prefix.
    """
    if isinstance(value, dict):
        for key, sub_value in value.items():
            sub_prefix = f"{prefix}_{key}" if prefix else str(key)
            flatten_report_metrics(sub_prefix, sub_value, out)
    elif isinstance(value, list):
        for item in value:
            if not isinstance(item, dict):
                continue
            year = item.get("year")
            sub_prefix = f"{prefix}_{int(year)}" if year is not None else prefix
            filtered_item = {
                k: v for k, v in item.items() if k not in ("project_id", "proj_id", "year")
            }
            flatten_report_metrics(sub_prefix, filtered_item, out)
    elif prefix:
        out[_sanitize_column_name(prefix)] = value


def _filter_by_project_id(value: Any, project_id: int) -> Any:
    """
    Walks the `results["projects"]` structure, keeping only list items whose
    "project_id" matches. Handles both flat per-metric lists (e.g.
    ABOVEGROUND_TOTAL, AET, BIOMASS_VOLUMES) and the nested
    {interval_key: [...]} shape used by TOTAL_FLAME_SEVERITY.
    """
    if isinstance(value, list):
        return [
            item
            for item in value
            if isinstance(item, dict) and item.get("project_id") == project_id
        ]
    if isinstance(value, dict):
        return {key: _filter_by_project_id(sub, project_id) for key, sub in value.items()}
    return value


def build_planning_area_feature(report: FundingOpportunityReport) -> Dict[str, Any]:
    scenario = report.scenario
    planning_area = scenario.planning_area
    results = report.results or {}

    properties: Dict[str, Any] = {
        "id": planning_area.pk,
        "name": planning_area.name,
        "region_name": planning_area.region_name or "",
        "scenario_id": scenario.pk,
    }
    flatten_report_metrics("", results.get("summary", {}), properties)
    flatten_report_metrics(
        "TREATMENT_AREA", results.get("treatment_areas", {}).get("total", {}), properties
    )

    geometry_json = json.loads(
        planning_area.geometry.transform(settings.CRS_GEOPACKAGE_EXPORT, clone=True).json
    )
    return {
        "geometry": to_multi(geometry_json),
        "properties": properties,
    }


def build_project_area_features(report: FundingOpportunityReport) -> List[Dict[str, Any]]:
    scenario = report.scenario
    results = report.results or {}
    projects_results = results.get("projects", {})
    treatment_area_projects = results.get("treatment_areas", {}).get("projects", {})

    features = []
    for project_area in scenario.project_areas.all():
        properties: Dict[str, Any] = {
            "id": project_area.pk,
            "proj_id": (project_area.data or {}).get("proj_id"),
            "name": project_area.name,
        }
        filtered = _filter_by_project_id(projects_results, project_area.pk)
        flatten_report_metrics("", filtered, properties)
        flatten_report_metrics(
            "TREATMENT_AREA",
            treatment_area_projects.get(str(project_area.pk), {}),
            properties,
        )

        geometry_json = json.loads(
            project_area.geometry.transform(settings.CRS_GEOPACKAGE_EXPORT, clone=True).json
        )
        features.append(
            {
                "geometry": to_multi(geometry_json),
                "properties": properties,
            }
        )
    return features


def export_planning_area_results_to_geopackage(
    report: FundingOpportunityReport, geopackage_path: Path
) -> None:
    feature = build_planning_area_feature(report)
    field_type_pairs = list(
        map(map_property_for_numeric_export, feature["properties"].items())
    )
    schema = {"geometry": "MultiPolygon", "properties": field_type_pairs}
    crs = from_epsg(settings.CRS_GEOPACKAGE_EXPORT)
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".gpkg,.gpkg-journal")):
            with fiona.open(
                str(geopackage_path),
                "w",
                layer="planning_area",
                crs=crs,
                driver="GPKG",
                schema=schema,
                allow_unsupported_drivers=True,
            ) as out:
                out.write(feature)
    except Exception as e:
        log.exception(
            "Error exporting planning area results for funding report %s to geopackage: %s",
            report.pk,
            e,
        )
        raise e


def export_project_areas_results_to_geopackage(
    report: FundingOpportunityReport, geopackage_path: Path
) -> None:
    features = build_project_area_features(report)
    if not features:
        log.warning(
            "Funding report %s has no project areas. Skipping project_areas "
            "geopackage layer.",
            report.pk,
        )
        return

    # Different project areas can have different sets of metric keys (e.g. a
    # metric/year missing from one project's filtered results), so the schema
    # must be built from the union of all features' fields, and every feature
    # padded with None for keys it doesn't have.
    all_fields: Dict[str, Any] = {}
    for feature in features:
        for key, value in feature["properties"].items():
            if key not in all_fields or all_fields[key] is None:
                all_fields[key] = value

    field_type_pairs = list(map(map_property_for_numeric_export, all_fields.items()))
    schema = {"geometry": "MultiPolygon", "properties": field_type_pairs}
    crs = from_epsg(settings.CRS_GEOPACKAGE_EXPORT)
    try:
        with fiona.Env(**get_gdal_env(allowed_extensions=".gpkg,.gpkg-journal")):
            with fiona.open(
                str(geopackage_path),
                "w",
                layer="project_areas",
                crs=crs,
                driver="GPKG",
                schema=schema,
                allow_unsupported_drivers=True,
            ) as out:
                for feature in features:
                    properties = {
                        key: feature["properties"].get(key) for key in all_fields
                    }
                    out.write({"geometry": feature["geometry"], "properties": properties})
    except Exception as e:
        log.exception(
            "Error exporting project area results for funding report %s to geopackage: %s",
            report.pk,
            e,
        )
        raise e


def export_treatment_raster_to_geopackage(
    report: FundingOpportunityReport, geopackage_path: Path
) -> None:
    datalayer = report.treatment_datalayer
    if datalayer is None or not datalayer.url:
        log.warning(
            "Funding report %s has no treatment datalayer. Skipping treatment_clip "
            "geopackage raster layer.",
            report.pk,
        )
        return

    try:
        with rasterio.Env(**get_gdal_env(allowed_extensions=".tif")):
            with rasterio.open(with_vsi_prefix(datalayer.url)) as src:
                data = src.read()
                profile = {
                    "driver": "GPKG",
                    "height": src.height,
                    "width": src.width,
                    "count": src.count,
                    "dtype": src.dtypes[0],
                    "crs": src.crs,
                    "transform": src.transform,
                    "nodata": src.nodata,
                }

        with rasterio.open(
            str(geopackage_path),
            "w",
            RASTER_TABLE="treatment_clip",
            APPEND_SUBDATASET="YES",
            **profile,
        ) as dst:
            dst.write(data)
    except Exception as e:
        log.exception(
            "Error exporting treatment raster for funding report %s to geopackage: %s",
            report.pk,
            e,
        )
        raise e


def export_funding_report_to_geopackage(
    report: FundingOpportunityReport,
) -> Optional[str]:
    report = FundingOpportunityReport.objects.select_related(
        "scenario__planning_area", "treatment_datalayer"
    ).get(pk=report.pk)
    try:
        report.geopackage_status = GeoPackageStatus.PROCESSING
        report.save(update_fields=["geopackage_status", "updated_at"])

        temp_folder = Path(settings.TEMP_GEOPACKAGE_FOLDER)
        if not temp_folder.exists():
            temp_folder.mkdir(parents=True)
        temp_file = temp_folder / f"funding_report_{report.pk}.gpkg"
        temp_file.unlink(missing_ok=True)

        export_planning_area_results_to_geopackage(report, temp_file)
        export_project_areas_results_to_geopackage(report, temp_file)
        export_treatment_raster_to_geopackage(report, temp_file)

        object_name = f"{settings.GEOPACKAGES_FOLDER}/funding_report_{report.pk}.gpkg"
        if settings.PROVIDER == "gcp":
            from core.gcs import upload_file_via_cli

            geopackage_path = f"gs://{settings.GCS_MEDIA_BUCKET}/{object_name}"
            upload_file_via_cli(
                object_name=object_name,
                input_file=str(temp_file),
                bucket_name=settings.GCS_MEDIA_BUCKET,
            )
        else:
            from core.s3 import upload_file_via_s3_client

            geopackage_path = f"s3://{settings.S3_BUCKET}/{object_name}"
            upload_file_via_s3_client(
                object_name=object_name,
                input_file=str(temp_file),
            )

        temp_file.unlink(missing_ok=True)
        report.geopackage_url = geopackage_path
        report.geopackage_status = GeoPackageStatus.SUCCEEDED
        report.save(update_fields=["geopackage_url", "geopackage_status", "updated_at"])
        return geopackage_path
    except Exception:
        log.exception("Failed to export funding report %s to geopackage.", report.pk)
        report.geopackage_url = None
        report.geopackage_status = GeoPackageStatus.FAILED
        report.save(update_fields=["geopackage_url", "geopackage_status", "updated_at"])
        return None
