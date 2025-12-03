import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Tuple
from uuid import uuid4

import numpy as np
import rasterio
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import MultiPolygon
from django.db import IntegrityError
from scipy.optimize import minimize

from datasets.models import (
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    GeometryType,
)
from datasets.services import create_datalayer, get_storage_url
from gis.info import get_gdal_env, info_raster
from gis.rasters import read_raster_window_downsampled, to_planscape_streaming

from climate_foresight.normalize import (
    calculate_outliers,
    s_shaped_membership,
    z_shaped_membership,
    trapezoidal_membership,
)

log = logging.getLogger(__name__)


def calculate_layer_statistics(
    input_layer: DataLayer,
    planning_area_geometry: MultiPolygon,
    target_sample_size: int = 10_000_000,
) -> Dict[str, Any]:
    """
    Calculate statistics for a data layer clipped to a planning area.

    This is a lightweight operation for frontend visualization (favorability charts).
    It calculates basic statistics (min, max, mean, std), traditional percentiles
    (p5, p10, p90, p95), and statistical outlier bounds using MAD (Median Absolute Deviation).

    Args:
        input_layer: The input DataLayer to analyze
        planning_area_geometry: MultiPolygon to clip the raster to (in EPSG:4269)
        target_sample_size: Target number of pixels for downsampled raster (default 10M)

    Returns:
        Dictionary containing:
            - statistics: Dict with min, max, mean, std, count, percentiles, and outliers
    """
    if input_layer.type != DataLayerType.RASTER:
        raise ValueError("Can only calculate percentiles for raster data layers")

    if not input_layer.url:
        raise ValueError("Input layer must have a valid URL")

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(input_layer.url) as src:
            downsampled, valid_mask, _ = read_raster_window_downsampled(
                src=src,
                geometry=planning_area_geometry,
                geometry_crs="EPSG:4269",
                target_pixels=target_sample_size,
                resampling=rasterio.enums.Resampling.bilinear,
            )

            sample_array = downsampled[valid_mask].astype(np.float32)

            if len(sample_array) == 0:
                raise ValueError("No valid pixels found in planning area")

            percentile_keys = [5, 10, 90, 95]
            percentile_values = np.percentile(sample_array, percentile_keys)
            percentiles = {
                f"p{p}": float(percentile_values[i])
                for i, p in enumerate(percentile_keys)
            }

            outlier_lower, outlier_upper = calculate_outliers(sample_array, k=3.0)

            lower_percentile = float(
                np.sum(sample_array <= outlier_lower) / len(sample_array) * 100
            )
            upper_percentile = float(
                np.sum(sample_array <= outlier_upper) / len(sample_array) * 100
            )

            statistics = {
                "min": float(np.min(sample_array)),
                "max": float(np.max(sample_array)),
                "mean": float(np.mean(sample_array)),
                "std": float(np.std(sample_array)),
                "count": int(len(sample_array)),
                "percentiles": percentiles,
                "outliers": {
                    "lower": {
                        "value": float(outlier_lower),
                        "percentile": lower_percentile,
                    },
                    "upper": {
                        "value": float(outlier_upper),
                        "percentile": upper_percentile,
                    },
                },
            }

            return {"statistics": statistics}


def get_reference_grid_for_run(
    run_id: int,
    planning_area_geometry: MultiPolygon,
    target_resolution_meters: float = 30.0,
) -> Tuple[rasterio.Affine, int, int, float]:
    """
    Create a consistent reference grid for all normalized layers in a Climate Foresight run.

    This ensures all normalized layers have the same shape and transform, which is required
    for stacking them during pillar rollup.

    Args:
        run_id: The ID of the ClimateForesightRun
        planning_area_geometry: MultiPolygon in EPSG:4269 to define bounds
        target_resolution_meters: Target pixel resolution in meters (default: 30m)

    Returns:
        Tuple of (transform, width, height, nodata_value) defining the reference grid
    """
    minx, miny, maxx, maxy = planning_area_geometry.extent

    meters_per_degree = 111000.0  # approximate, should work for most cases
    resolution_degrees = target_resolution_meters / meters_per_degree

    width = max(1, int(np.ceil((maxx - minx) / resolution_degrees)))
    height = max(1, int(np.ceil((maxy - miny) / resolution_degrees)))

    transform = rasterio.Affine(
        resolution_degrees,  # x direction
        0.0,
        minx,
        0.0,
        -resolution_degrees,  # y direction (negative)
        maxy,
    )

    nodata = -9999.0

    log.info(
        f"Reference grid for run {run_id}: "
        f"width={width}, height={height}, "
        f"resolution={resolution_degrees:.8f} degrees (~{target_resolution_meters}m), "
        f"bounds=({minx:.6f}, {miny:.6f}, {maxx:.6f}, {maxy:.6f})"
    )

    return transform, width, height, nodata


def normalize_raster_layer(
    input_layer: DataLayer,
    run_id: int,
    created_by: User,
    planning_area_geometry: MultiPolygon,
    favor_high: bool = True,
) -> Dict[str, Any]:
    """
    Normalize a raster data layer clipped to a planning area for climate foresight analysis.

    This function uses fuzzy logic membership functions to translate raw data values to
    a standardized 0-1 favorability scale. The translation function is determined by:
    1. Metadata configuration (if "trap" specified, uses trapezoidal two-tailed)
    2. User-selected favorability (favor_high determines linear function direction)

    Three membership functions:
    - lsmf (S-shaped): High values → 1, low values → 0 (favor_high=True)
    - lzmf (Z-shaped): Low values → 1, high values → 0 (favor_high=False)
    - trap (Trapezoidal): Middle values → 1, extreme values → 0

    Endpoints are calculated using one of three methods:
    - "outliers": Statistical outlier detection using MAD (Median Absolute Deviation)
    - "full_range": Use min/max of data
    - "empirical": Use pre-defined endpoints from metadata

    NOTE: Endpoints are always calculated from full-resolution clipped raster data for
    maximum accuracy. calculate_layer_statistics() provides downsampled statistics for
    UI visualization only.

    Args:
        input_layer: The input DataLayer to normalize
        run_id: The ID of the ClimateForesightRun this belongs to
        created_by: User creating the normalized layer
        planning_area_geometry: MultiPolygon to clip the raster to (in EPSG:4269)
        favor_high: If True, high values are favorable (default). If False, low values are favorable

    Returns:
        Dictionary containing:
            - datalayer: The created normalized DataLayer
            - normalization_info: Dict with function, endpoints_method, endpoints, outlier_k
    """
    if input_layer.type != DataLayerType.RASTER:
        raise ValueError("Can only normalize raster data layers")

    if not input_layer.url:
        raise ValueError("Input layer must have a valid URL")

    ref_transform, ref_width, ref_height, ref_nodata = get_reference_grid_for_run(
        run_id, planning_area_geometry
    )

    with rasterio.Env(**get_gdal_env()):
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
            temp_clipped_path = tmp.name

        with rasterio.open(input_layer.url) as src:
            log.info(
                f"Source raster info - url: {input_layer.url}, "
                f"shape: ({src.height}, {src.width}), "
                f"dtype: {src.dtypes[0]}, "
                f"nodata: {src.nodata}, "
                f"crs: {src.crs}"
            )

            clipped_data, valid_mask, clipped_transform = (
                read_raster_window_downsampled(
                    src=src,
                    geometry=planning_area_geometry,
                    geometry_crs="EPSG:4269",
                    target_pixels=None,
                    resampling=rasterio.enums.Resampling.nearest,
                )
            )

            log.info(
                f"After initial clip - "
                f"clipped_data shape: {clipped_data.shape}, "
                f"dtype: {clipped_data.dtype}, "
                f"valid_mask sum: {np.sum(valid_mask)}"
            )

            src_nodata = src.nodata if src.nodata is not None else -9999
            src_crs = src.crs

            clipped_data = clipped_data.astype(np.float32)
            clipped_data[~valid_mask] = src_nodata

        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp2:
            temp_initial_clip = tmp2.name

        initial_profile = {
            "driver": "GTiff",
            "dtype": rasterio.float32,
            "width": clipped_data.shape[1],
            "height": clipped_data.shape[0],
            "count": 1,
            "crs": src_crs,
            "transform": clipped_transform,
            "nodata": src_nodata,
        }

        with rasterio.open(temp_initial_clip, "w", **initial_profile) as dst:
            dst.write(clipped_data, 1)

        log.info(f"Wrote initial clipped raster to: {temp_initial_clip}")

        log.info(
            f"Resampling to reference grid: {ref_width}x{ref_height} "
            f"(original clipped: {clipped_data.shape[1]}x{clipped_data.shape[0]})"
        )

        from rasterio.warp import reproject, Resampling
        from rasterio.features import geometry_mask
        import json

        aligned_data = np.full((ref_height, ref_width), ref_nodata, dtype=np.float32)

        with rasterio.open(temp_initial_clip) as clip_src:
            reproject(
                source=rasterio.band(clip_src, 1),
                destination=aligned_data,
                src_transform=clip_src.transform,
                src_crs=clip_src.crs,
                src_nodata=clip_src.nodata,
                dst_transform=ref_transform,
                dst_crs="EPSG:4269",
                dst_nodata=ref_nodata,
                resampling=Resampling.bilinear,
            )

        geom_geojson = json.loads(planning_area_geometry.json)
        geom_mask = geometry_mask(
            [geom_geojson],
            out_shape=(ref_height, ref_width),
            transform=ref_transform,
            invert=True,
        )
        aligned_data[~geom_mask] = ref_nodata

        log.info(
            f"After resampling to reference grid - "
            f"shape: {aligned_data.shape}, "
            f"valid pixels: {np.sum(aligned_data != ref_nodata)}, "
            f"min: {np.min(aligned_data[aligned_data != ref_nodata]) if np.any(aligned_data != ref_nodata) else 'N/A'}, "
            f"max: {np.max(aligned_data[aligned_data != ref_nodata]) if np.any(aligned_data != ref_nodata) else 'N/A'}"
        )

        profile = {
            "driver": "GTiff",
            "dtype": rasterio.float32,
            "width": ref_width,
            "height": ref_height,
            "count": 1,
            "crs": "EPSG:4269",
            "transform": ref_transform,
            "nodata": ref_nodata,
        }

        with rasterio.open(temp_clipped_path, "w", **profile) as dst:
            dst.write(aligned_data, 1)

        log.info(f"Wrote aligned raster to: {temp_clipped_path}")

        try:
            os.unlink(temp_initial_clip)
        except Exception as e:
            log.warning(f"Failed to clean up temp file {temp_initial_clip}: {e}")

        cf_meta = input_layer.metadata.get("modules", {}).get("climate_foresight", {})
        translation = cf_meta.get("translation", {})

        function = translation.get("function")
        if function != "trap":
            function = "lsmf" if favor_high else "lzmf"

        endpoints_method = translation.get("endpoints_method", "outliers")
        empirical_endpoints = translation.get("empirical_endpoints")
        outlier_k = translation.get("outlier_k", 3.0)

        with rasterio.open(temp_clipped_path) as src:
            profile = src.profile.copy()
            nodata = src.nodata

            all_valid_data = []
            total_pixels = 0
            valid_pixels = 0

            for _, window in src.block_windows(1):
                block_data = src.read(1, window=window)
                total_pixels += block_data.size

                if nodata is not None:
                    valid = block_data[block_data != nodata]
                else:
                    valid = block_data[~np.isnan(block_data)]

                valid_pixels += len(valid)

                if len(valid) > 0:
                    all_valid_data.append(valid)

            if not all_valid_data:
                log.error("No valid data found in clipped raster!")
                all_valid_array = np.array([], dtype=np.float32)
            else:
                all_valid_array = np.concatenate(all_valid_data).astype(np.float32)

            del all_valid_data

            if endpoints_method == "outliers":
                lower_endpoint, upper_endpoint = calculate_outliers(
                    all_valid_array, k=outlier_k
                )
                endpoints = [lower_endpoint, upper_endpoint]

            elif endpoints_method == "full_range":
                endpoints = [
                    float(np.min(all_valid_array)),
                    float(np.max(all_valid_array)),
                ]

            elif endpoints_method == "empirical":
                if empirical_endpoints is None:
                    raise ValueError(
                        f"Layer {input_layer.id} uses empirical endpoints but none are provided in metadata"
                    )
                endpoints = empirical_endpoints

            else:
                raise ValueError(
                    f"Unknown endpoints method '{endpoints_method}' for layer {input_layer.id}"
                )

            del all_valid_array

            profile.update(dtype=rasterio.float32, nodata=nodata if nodata else -9999)

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_file:
                temp_path = tmp_file.name

            with rasterio.open(temp_path, "w", **profile) as dst:
                for _, window in src.block_windows(1):
                    block_data = src.read(1, window=window)

                    output_block = np.full_like(
                        block_data, nodata if nodata else -9999, dtype=np.float32
                    )

                    if nodata is not None:
                        valid_mask = block_data != nodata
                    else:
                        valid_mask = ~np.isnan(block_data)

                    if np.any(valid_mask):
                        valid_values = block_data[valid_mask].astype(float)

                        if function == "lsmf":
                            translated = s_shaped_membership(
                                valid_values, endpoints[0], endpoints[1]
                            )

                        elif function == "lzmf":
                            translated = z_shaped_membership(
                                valid_values, endpoints[0], endpoints[1]
                            )

                        elif function == "trap":
                            if len(endpoints) != 4:
                                raise ValueError(
                                    f"Trapezoidal function requires 4 endpoints, got {len(endpoints)}"
                                )
                            translated = trapezoidal_membership(
                                valid_values,
                                endpoints[0],
                                endpoints[1],
                                endpoints[2],
                                endpoints[3],
                            )

                        else:
                            raise ValueError(
                                f"Unknown function '{function}' for layer {input_layer.id}"
                            )

                        output_block[valid_mask] = translated

                    dst.write(output_block, 1, window=window)

    uuid = str(uuid4())
    dataset = Dataset.objects.get(pk=settings.CLIMATE_FORESIGHT_DATASET_ID)
    organization = input_layer.organization

    original_name = f"normalized_{uuid}.tif"

    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
    )

    to_planscape_streaming(
        input_file=temp_path,
        output_file=storage_url,
    )

    raster_info = info_raster(storage_url)

    metadata = {
        "modules": {
            "climate_foresight": {
                "normalized_input": True,
                "run_id": run_id,
                "original_layer_id": input_layer.id,
            }
        }
    }

    normalized_layer_name = f"{input_layer.name} (Normalized for CF Run {run_id})"

    try:
        datalayer_result = create_datalayer(
            name=normalized_layer_name,
            dataset=dataset,
            organization=organization,
            created_by=created_by,
            original_name=original_name,
            type=DataLayerType.RASTER,  # type: ignore
            geometry_type=GeometryType.RASTER,  # type: ignore
            category=None,
            metadata=metadata,
            info=raster_info,
            status=DataLayerStatus.PENDING,
        )

        normalized_layer = datalayer_result["datalayer"]
        normalized_layer.url = storage_url
        normalized_layer.save()
    except IntegrityError:
        # another task created the layer between our check and insert
        # can happen especially on smaller planning areas with a few input layers
        log.warning(
            f"IntegrityError creating normalized layer '{normalized_layer_name}'. "
            "Fetching existing layer created by concurrent task."
        )
        existing_layer = DataLayer.objects.filter(
            dataset=dataset,
            name=normalized_layer_name,
            type=DataLayerType.RASTER,
        ).first()

        if existing_layer:
            try:
                Path(temp_path).unlink(missing_ok=True)
                Path(temp_clipped_path).unlink(missing_ok=True)
            except Exception as e:
                log.warning(f"Failed to clean up temp files: {e}")

            return {
                "datalayer": existing_layer,
                "normalization_info": {
                    "function": function,
                    "endpoints_method": endpoints_method,
                    "endpoints": endpoints,
                    "outlier_k": outlier_k if endpoints_method == "outliers" else None,
                },
            }
        else:
            raise

    try:
        Path(temp_path).unlink(missing_ok=True)
        Path(temp_clipped_path).unlink(missing_ok=True)
    except Exception as e:
        log.warning(f"Failed to clean up temp files: {e}")

    return {
        "datalayer": normalized_layer,
        "normalization_info": {
            "function": function,
            "endpoints_method": endpoints_method,
            "endpoints": endpoints,
            "outlier_k": outlier_k if endpoints_method == "outliers" else None,
        },
    }


def calculate_optimized_weights(
    raster_layers: List[DataLayer],
    planning_area_geometry: MultiPolygon,
    target_sample_size: int = 1_000_000,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Calculate optimized weights for aggregating multiple normalized rasters.

    Uses the same algorithm as R's compost::optimized_weights with Pearson correlation.
    The optimization minimizes the difference between the normalized correlation of each
    metric to the composite and a balanced target (equal contribution).

    Args:
        raster_layers: List of normalized DataLayers to aggregate
        planning_area_geometry: Planning area to clip to (in EPSG:4269)
        target_sample_size: Number of pixels to sample for correlation calculation

    Returns:
        Tuple of (weights, correlation_scores) where:
            - weights: Optimized normalized weights (sum to 1.0)
            - correlation_scores: Normalized correlation of each metric to composite
    """
    if len(raster_layers) == 0:
        raise ValueError("Must provide at least one raster layer")

    if len(raster_layers) == 1:
        # single layer, weight is 1.0, correlation is 1.0
        return (np.array([1.0]), np.array([1.0]))

    log.info(
        f"Calculating optimized weights for {len(raster_layers)} rasters using Pearson correlation"
    )

    raster_data = []
    with rasterio.Env(**get_gdal_env()):
        for layer in raster_layers:
            with rasterio.open(layer.url) as src:
                downsampled, valid_mask, _ = read_raster_window_downsampled(
                    src=src,
                    geometry=planning_area_geometry,
                    geometry_crs="EPSG:4269",
                    target_pixels=target_sample_size,
                    resampling=rasterio.enums.Resampling.bilinear,
                )
                values = downsampled[valid_mask].astype(np.float32)
                raster_data.append(values)

    # ensure all rasters have the same number of valid pixels
    min_length = min(len(r) for r in raster_data)
    raster_data = [r[:min_length] for r in raster_data]
    raster_stack = np.stack(raster_data, axis=0)

    log.info(f"Loaded {len(raster_data)} rasters with {min_length} valid pixels each")

    # objective function
    target_vals = np.ones(len(raster_layers))
    correlation_out = np.ones(
        len(raster_layers)
    )  # to store correlation from last iteration

    def objective_function(w):
        nonlocal correlation_out

        w_norm = w / np.sum(w)

        composite = np.sum(raster_stack * w_norm[:, np.newaxis], axis=0)

        # calculate Pearson correlation between composite and each metric
        correlations = np.array(
            [np.corrcoef(composite, raster_stack[i, :])[0, 1] for i in range(len(w))]
        )

        corr_norm = correlations / np.sum(correlations)

        target_norm = target_vals / np.sum(target_vals)
        sqdiff = np.log(np.sum((target_norm - corr_norm) ** 2) / len(corr_norm))

        correlation_out = corr_norm

        return sqdiff

    # optimize weights using L-BFGS-B
    initial_weights = np.ones(len(raster_layers))
    result = minimize(
        objective_function,
        x0=initial_weights,
        method="L-BFGS-B",
        bounds=[(0.001, None) for _ in range(len(raster_layers))],
        options={"ftol": 1e-5, "maxiter": 500},
    )

    if not result.success:
        log.warning(f"Weight optimization did not fully converge: {result.message}")

    optimized_weights = result.x / np.sum(result.x)

    return (optimized_weights, correlation_out)


def rollup_pillar(
    run_id: int,
    pillar_id: int,
    created_by: User,
    method: str = "optimized",
) -> Dict[str, Any]:
    """
    Rollup (aggregate) normalized metrics to a pillar score.

    This function:
    1. Gets all normalized layers assigned to the pillar in this run
    2. Calculates weights (optimized or equal)
    3. Computes weighted average of the normalized rasters
    4. Creates a new DataLayer with the pillar rollup raster

    Args:
        run_id: ID of the ClimateForesightRun
        pillar_id: ID of the ClimateForesightPillar to rollup
        created_by: User creating the rollup
        method: Weight calculation method ("optimized" or "equal")

    Returns:
        Dictionary containing:
            - datalayer: The created rollup DataLayer
            - weights: Dict mapping layer_id -> weight
            - correlation_scores: Dict mapping layer_id -> correlation (if optimized)
            - method: Weight method used
    """
    from climate_foresight.models import (
        ClimateForesightRun,
        ClimateForesightPillar,
        ClimateForesightRunInputDataLayer,
    )

    run = ClimateForesightRun.objects.get(pk=run_id)
    pillar = ClimateForesightPillar.objects.get(pk=pillar_id)
    planning_area_geometry = run.planning_area.geometry

    log.info(
        f"Starting pillar rollup for run={run.name}, pillar={pillar.name}, method={method}"
    )

    input_layers = ClimateForesightRunInputDataLayer.objects.filter(
        run=run, pillar=pillar
    ).select_related("normalized_datalayer")

    if not input_layers.exists():
        raise ValueError(
            f"No input layers assigned to pillar {pillar.name} in run {run.name}"
        )

    rollup_layer_name = f"Pillar: {pillar.name} (CF Run {run_id})"
    first_normalized = input_layers.filter(normalized_datalayer__isnull=False).first()
    if first_normalized and first_normalized.normalized_datalayer:
        existing_rollup = DataLayer.objects.filter(
            dataset=first_normalized.normalized_datalayer.dataset,
            name=rollup_layer_name,
            type=DataLayerType.RASTER,
        ).first()

        if existing_rollup:
            log.warning(
                f"Found existing pillar rollup datalayer '{rollup_layer_name}' "
                f"(id={existing_rollup.id}). Returning it instead of creating duplicate."
            )
            return {
                "datalayer": existing_rollup,
                "weights": {},
                "correlation_scores": {},
                "method": method,
            }

    normalized_layers = [
        input_layer.normalized_datalayer
        for input_layer in input_layers
        if input_layer.normalized_datalayer is not None
    ]

    if len(normalized_layers) == 0:
        raise ValueError(
            f"No normalized layers found for pillar {pillar.name}. Run normalization first."
        )

    log.info(f"Found {len(normalized_layers)} normalized layers for rollup")

    if method == "optimized":
        weights, correlations = calculate_optimized_weights(
            normalized_layers, planning_area_geometry
        )
    elif method == "equal":
        weights = np.ones(len(normalized_layers)) / len(normalized_layers)
        correlations = weights.copy()
    else:
        raise ValueError(f"Unknown weight method: {method}")

    with rasterio.Env(**get_gdal_env()):
        # get profile from first layer
        with rasterio.open(normalized_layers[0].url) as src:
            profile = src.profile.copy()
            nodata = src.nodata if src.nodata is not None else -9999

        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_file:
            temp_path = tmp_file.name

        profile.update(dtype=rasterio.float32, nodata=nodata)

        with rasterio.open(temp_path, "w", **profile) as dst:
            with rasterio.open(normalized_layers[0].url) as src:
                for _, window in src.block_windows(1):
                    block_stack = []
                    for layer in normalized_layers:
                        with rasterio.open(layer.url) as layer_src:
                            block_data = layer_src.read(1, window=window)
                            block_stack.append(block_data)

                    block_stack = np.array(block_stack, dtype=np.float32)

                    output_block = np.zeros(block_stack.shape[1:], dtype=np.float32)

                    if nodata is not None:
                        valid_mask = np.all(block_stack != nodata, axis=0)
                    else:
                        valid_mask = np.all(~np.isnan(block_stack), axis=0)

                    if np.any(valid_mask):
                        for i, weight in enumerate(weights):
                            output_block[valid_mask] += (
                                block_stack[i, valid_mask] * weight
                            )

                    output_block[~valid_mask] = nodata

                    dst.write(output_block, 1, window=window)

    uuid = str(uuid4())
    dataset = Dataset.objects.get(pk=settings.CLIMATE_FORESIGHT_DATASET_ID)
    organization = normalized_layers[0].organization

    original_name = f"pillar_rollup_{pillar.name.replace(' ', '_')}_{uuid}.tif"

    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
    )

    to_planscape_streaming(
        input_file=temp_path,
        output_file=storage_url,
    )

    raster_info = info_raster(storage_url)

    metadata = {
        "modules": {
            "climate_foresight": {
                "pillar_rollup": True,
                "run_id": run_id,
                "pillar_id": pillar_id,
                "pillar_name": pillar.name,
            }
        }
    }

    # double-check for duplicate right before creating datalayer (race condition protection)
    existing_rollup = DataLayer.objects.filter(
        dataset=dataset,
        name=rollup_layer_name,
        type=DataLayerType.RASTER,
    ).first()

    if existing_rollup:
        log.warning(
            f"Found existing pillar rollup datalayer '{rollup_layer_name}' "
            f"(id={existing_rollup.id}) right before creation. Returning it instead."
        )
        try:
            Path(temp_path).unlink(missing_ok=True)
        except Exception as e:
            log.warning(f"Failed to clean up temp file: {e}")

        return {
            "datalayer": existing_rollup,
            "weights": {},
            "correlation_scores": {},
            "method": method,
        }

    try:
        datalayer_result = create_datalayer(
            name=rollup_layer_name,
            dataset=dataset,
            organization=organization,
            created_by=created_by,
            original_name=original_name,
            type=DataLayerType.RASTER,  # type: ignore
            geometry_type=GeometryType.RASTER,  # type: ignore
            category=None,
            metadata=metadata,
            info=raster_info,
            status=DataLayerStatus.PENDING,
        )

        rollup_layer = datalayer_result["datalayer"]
        rollup_layer.url = storage_url
        rollup_layer.save()
    except IntegrityError:
        # another task created the layer between our check and insert
        # can happen especially on smaller planning areas with a few input layers
        log.warning(
            f"IntegrityError creating pillar rollup '{rollup_layer_name}'. "
            "Fetching existing layer created by concurrent task."
        )
        existing_rollup = DataLayer.objects.filter(
            dataset=dataset,
            name=rollup_layer_name,
            type=DataLayerType.RASTER,
        ).first()

        if existing_rollup:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except Exception as e:
                log.warning(f"Failed to clean up temp file: {e}")

            return {
                "datalayer": existing_rollup,
                "weights": {},
                "correlation_scores": {},
                "method": method,
            }
        else:
            # should never happen, but re-raise just in case
            raise

    try:
        Path(temp_path).unlink(missing_ok=True)
    except Exception as e:
        log.warning(f"Failed to clean up temp file: {e}")

    weights_dict = {
        str(normalized_layers[i].id): float(weights[i])
        if not np.isnan(weights[i])
        else None
        for i in range(len(normalized_layers))
    }
    correlation_dict = {
        str(normalized_layers[i].id): float(correlations[i])
        if not np.isnan(correlations[i])
        else None
        for i in range(len(normalized_layers))
    }

    log.info(f"Successfully created pillar rollup layer {rollup_layer.id}")

    return {
        "datalayer": rollup_layer,
        "weights": weights_dict,
        "correlation_scores": correlation_dict,
        "method": method,
    }

