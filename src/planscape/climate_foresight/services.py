import logging
import tempfile
from pathlib import Path
from typing import Dict, Any
from uuid import uuid4

import numpy as np
import rasterio
from django.conf import settings
from django.contrib.auth.models import User

from core import s3, gcs
from datasets.models import DataLayer, DataLayerStatus, DataLayerType
from datasets.services import create_datalayer, get_object_name, get_storage_url
from gis.info import get_gdal_env
from gis.rasters import to_planscape
from scipy import stats

log = logging.getLogger(__name__)


def calculate_layer_percentiles(
    input_layer: DataLayer,
    target_sample_size: int = 10_000_000,
) -> Dict[str, Any]:
    """
    Calculate percentile thresholds for a data layer using downsampled raster.

    This is a lightweight operation for frontend visualization (favorability charts).
    It only calculates percentiles and does not determine transformations.

    Args:
        input_layer: The input DataLayer to analyze
        target_sample_size: Target number of pixels for downsampled raster (default 10M)

    Returns:
        Dictionary containing:
            - outlier_thresholds: Dict with p5, p10, p90, p95 percentiles
    """
    if input_layer.type != DataLayerType.RASTER:
        raise ValueError("Can only calculate percentiles for raster data layers")

    if not input_layer.url:
        raise ValueError("Input layer must have a valid URL")

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(input_layer.url) as src:
            nodata = src.nodata
            total_pixels = src.height * src.width

            downsample_factor = max(1, int(np.sqrt(total_pixels / target_sample_size)))
            out_height = src.height // downsample_factor
            out_width = src.width // downsample_factor

            downsampled = src.read(
                1,
                out_shape=(out_height, out_width),
                resampling=rasterio.enums.Resampling.average,
            )

            if nodata is not None:
                valid_mask = downsampled != nodata
            else:
                valid_mask = ~np.isnan(downsampled)

            sample_array = downsampled[valid_mask].astype(np.float32)

            percentiles = [5, 10, 90, 95]
            percentile_values = np.percentile(sample_array, percentiles)
            outlier_thresholds = {
                f"p{p}": float(percentile_values[i]) for i, p in enumerate(percentiles)
            }

            return {
                "outlier_thresholds": outlier_thresholds,
            }


def calculate_layer_statistics(
    input_layer: DataLayer,
    target_sample_size: int = 10_000_000,
) -> Dict[str, Any]:
    """
    Calculate statistics and transformation parameters for a data layer using downsampled raster.

    This is a lightweight operation that downsamples the raster to determine:
    - Outlier thresholds (percentiles)
    - Best transformation type
    - Transformation parameters (i.e. lambda for box-cox/yeo-johnson)

    Unlike normalize_raster_layer(), this does NOT transform the entire raster.

    Args:
        input_layer: The input DataLayer to analyze
        target_sample_size: Target number of pixels for downsampled raster (default 10M)

    Returns:
        Dictionary containing:
            - outlier_thresholds: Dict with p5, p10, p90, p95 percentiles
            - transformation_type: Best transformation (none, log, sqrt, box-cox, yeo-johnson)
            - transformation_params: Parameters needed for transformation
            - original_skew: Skewness of original data
            - transformed_skew: Skewness after transformation
    """
    if input_layer.type != DataLayerType.RASTER:
        raise ValueError("Can only calculate statistics for raster data layers")

    if not input_layer.url:
        raise ValueError("Input layer must have a valid URL")

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(input_layer.url) as src:
            nodata = src.nodata
            total_pixels = src.height * src.width

            downsample_factor = max(1, int(np.sqrt(total_pixels / target_sample_size)))
            out_height = src.height // downsample_factor
            out_width = src.width // downsample_factor

            downsampled = src.read(
                1,
                out_shape=(out_height, out_width),
                resampling=rasterio.enums.Resampling.average,
            )

            if nodata is not None:
                valid_mask = downsampled != nodata
            else:
                valid_mask = ~np.isnan(downsampled)

            sample_array = downsampled[valid_mask].astype(np.float32)

            percentiles = [5, 10, 90, 95]
            percentile_values = np.percentile(sample_array, percentiles)
            outlier_thresholds = {
                f"p{p}": float(percentile_values[i]) for i, p in enumerate(percentiles)
            }

            original_skew = stats.skew(sample_array)

            needs_transform = abs(original_skew) > 1

            transformation_type = "none"
            transformation_params = {}
            transformed_skew = original_skew

            if needs_transform:
                best_skew = abs(original_skew)

                try:
                    from climate_foresight.normalize import (
                        safe_log_transform,
                        safe_sqrt_transform,
                        safe_boxcox_transform,
                        safe_yeojohnson_transform,
                    )

                    for trans_name, trans_func in [
                        ("log", safe_log_transform),
                        ("sqrt", safe_sqrt_transform),
                        ("box-cox", safe_boxcox_transform),
                        ("yeo-johnson", safe_yeojohnson_transform),
                    ]:
                        try:
                            transformed = trans_func(sample_array)
                            if transformed is not None:
                                new_skew = abs(stats.skew(transformed))
                                if new_skew < best_skew:
                                    best_skew = new_skew
                                    transformation_type = trans_name
                                    transformed_skew = new_skew
                                    transformation_params = {}

                                    if trans_name == "log":
                                        if np.any(sample_array <= 0):
                                            transformation_params["shift"] = float(
                                                -np.min(sample_array) + 1
                                            )
                                    elif trans_name == "sqrt":
                                        if np.any(sample_array < 0):
                                            transformation_params["shift"] = float(
                                                -np.min(sample_array)
                                            )
                                    elif trans_name == "box-cox":
                                        ref_shifted = sample_array
                                        if np.any(sample_array <= 0):
                                            shift = -np.min(sample_array) + 1
                                            ref_shifted = sample_array + shift
                                            transformation_params["shift"] = float(
                                                shift
                                            )
                                        _, lambda_param = stats.boxcox(ref_shifted)
                                        transformation_params["lambda"] = float(
                                            lambda_param
                                        )
                                    elif trans_name == "yeo-johnson":
                                        _, lambda_param = stats.yeojohnson(sample_array)
                                        transformation_params["lambda"] = float(
                                            lambda_param
                                        )
                        except Exception as e:
                            log.warning(f"Transformation {trans_name} failed: {e}")

                except Exception as e:
                    log.error(
                        f"Failed during transformation testing: {e}", exc_info=True
                    )
                    transformation_type = "none"
                    transformation_params = {}
                    transformed_skew = original_skew

            return {
                "outlier_thresholds": outlier_thresholds,
                "transformation_type": transformation_type,
                "transformation_params": transformation_params,
                "original_skew": float(original_skew),
                "transformed_skew": float(transformed_skew),
            }


def _safe_ad_test(data: np.ndarray) -> float:
    """
    Safely perform Anderson-Darling test for normality.

    Args:
        data: Array of values to test

    Returns:
        Approximate p-value
    """

    try:
        result: AndersonResult = stats.anderson(data, dist="norm")
        statistic: float = result.statistic

        if statistic < result.critical_values[4]:
            return 0.05
        elif statistic < result.critical_values[3]:
            return 0.02
        elif statistic < result.critical_values[2]:
            return 0.01
        elif statistic < result.critical_values[1]:
            return 0.005
        else:
            return 0.001
    except Exception:
        return np.nan


def _apply_transformation(
    values: np.ndarray, transformation: str, reference_data: dict
) -> np.ndarray:
    """
    Apply a specific transformation to values.

    Args:
        values: Values to transform
        transformation: Type of transformation ('none', 'log', 'sqrt', 'box-cox', 'yeo-johnson')
        reference_data: Dict with 'values' (sample data) and 'transformation' type

    Returns:
        Transformed values
    """

    ref_values = reference_data["values"]

    if transformation == "none":
        return values

    elif transformation == "log":
        if np.any(ref_values <= 0):
            shift = -np.min(ref_values) + 1
            return np.log(values + shift)
        return np.log(values)

    elif transformation == "sqrt":
        if np.any(ref_values < 0):
            shift = -np.min(ref_values)
            return np.sqrt(values + shift)
        return np.sqrt(values)

    elif transformation == "box-cox":
        if np.any(ref_values <= 0):
            ref_shifted = ref_values - np.min(ref_values) + 1
            shift = -np.min(ref_values) + 1
        else:
            ref_shifted = ref_values
            shift = 0

        _, lambda_param = stats.boxcox(ref_shifted)

        vals_shifted = values + shift if shift else values
        if lambda_param == 0:
            return np.log(vals_shifted)
        else:
            return (np.power(vals_shifted, lambda_param) - 1) / lambda_param

    elif transformation == "yeo-johnson":
        _, lambda_param = stats.yeojohnson(ref_values)

        # yeo-johnson transform formula varies based on sign and lambda
        result = np.zeros_like(values, dtype=float)

        if lambda_param == 0:
            pos_mask = values >= 0
            result[pos_mask] = np.log(values[pos_mask] + 1)
            result[~pos_mask] = -np.log(-values[~pos_mask] + 1)
        elif lambda_param == 2:
            pos_mask = values >= 0
            result[pos_mask] = -np.log(values[pos_mask] + 1)
            result[~pos_mask] = np.log(-values[~pos_mask] + 1)
        else:
            pos_mask = values >= 0
            result[pos_mask] = (
                np.power(values[pos_mask] + 1, lambda_param) - 1
            ) / lambda_param
            result[~pos_mask] = -(
                np.power(-values[~pos_mask] + 1, 2 - lambda_param) - 1
            ) / (2 - lambda_param)

        return result

    else:
        return values


def normalize_raster_layer(
    input_layer: DataLayer,
    run_id: int,
    created_by: User,
) -> Dict[str, Any]:
    """
    Normalize a raster data layer for climate foresight analysis.

    Args:
        input_layer: The input DataLayer to normalize
        run_id: The ID of the ClimateForesightRun this belongs to
        created_by: User creating the normalized layer

    Returns:
        Dictionary containing:
            - datalayer: The created normalized DataLayer
            - transformation_info: Dict with transformation, original_skew, transformed_skew
    """
    if input_layer.type != DataLayerType.RASTER:
        raise ValueError("Can only normalize raster data layers")

    if not input_layer.url:
        raise ValueError("Input layer must have a valid URL")

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(input_layer.url) as src:
            profile = src.profile.copy()
            nodata = src.nodata

            all_valid_data = []

            for _, window in src.block_windows(1):
                block_data = src.read(1, window=window)

                if nodata is not None:
                    valid = block_data[block_data != nodata]
                else:
                    valid = block_data[~np.isnan(block_data)]

                if len(valid) > 0:
                    all_valid_data.append(valid)

            with tempfile.NamedTemporaryFile(suffix=".npy", delete=False) as tmp:
                temp_array_path = tmp.name

            all_valid_array = np.concatenate(all_valid_data).astype(np.float32)
            np.save(temp_array_path, all_valid_array)

            del all_valid_data

            original_skew = stats.skew(all_valid_array)
            del all_valid_array

            full_array = np.load(temp_array_path, mmap_mode="r")
            ad_sample_size = min(10_000_000, len(full_array))
            indices = np.linspace(
                0, len(full_array) - 1, ad_sample_size, dtype=np.int64
            )
            ad_sample = full_array[indices].copy()
            del full_array, indices

            original_ad_pval = _safe_ad_test(ad_sample)
            del ad_sample

            needs_transform = (abs(original_skew) > 1) or (original_ad_pval < 0.01)

            all_valid_array = np.load(temp_array_path)

            transformation = "none"
            transformed_skew = original_skew

            if needs_transform:
                best_skew = abs(original_skew)

                TARGET_SAMPLE_SIZE = 10_000_000
                total_pixels = src.height * src.width
                downsample_factor = max(
                    1, int(np.sqrt(total_pixels / TARGET_SAMPLE_SIZE))
                )
                out_height = src.height // downsample_factor
                out_width = src.width // downsample_factor

                downsampled = src.read(
                    1,
                    out_shape=(out_height, out_width),
                    resampling=rasterio.enums.Resampling.average,
                )

                if nodata is not None:
                    valid_mask = downsampled != nodata
                else:
                    valid_mask = ~np.isnan(downsampled)

                sample_array = downsampled[valid_mask].astype(np.float32)

                from climate_foresight.normalize import (
                    safe_log_transform,
                    safe_sqrt_transform,
                    safe_boxcox_transform,
                    safe_yeojohnson_transform,
                )

                for trans_name, trans_func in [
                    ("log", safe_log_transform),
                    ("sqrt", safe_sqrt_transform),
                    ("box-cox", safe_boxcox_transform),
                    ("yeo-johnson", safe_yeojohnson_transform),
                ]:
                    try:
                        if trans_name in ["box-cox", "yeo-johnson"]:
                            transformed = trans_func(sample_array)
                        else:
                            transformed = trans_func(all_valid_array)

                        if transformed is not None:
                            new_skew = abs(stats.skew(transformed))
                            if new_skew < best_skew:
                                best_skew = new_skew
                                transformation = trans_name
                                transformed_skew = new_skew
                            del transformed
                    except Exception as e:
                        log.warning(f"Transformation {trans_name} failed: {e}")

                del sample_array, downsampled

            reference_data = {
                "values": all_valid_array,
                "transformation": transformation,
            }

            Path(temp_array_path).unlink(missing_ok=True)

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
                        transformed = _apply_transformation(
                            valid_values, transformation, reference_data
                        )
                        output_block[valid_mask] = transformed

                    dst.write(output_block, 1, window=window)

    processed_files = to_planscape(temp_path)
    final_raster = processed_files[0]

    uuid = str(uuid4())
    dataset = input_layer.dataset
    organization = input_layer.organization

    original_name = f"normalized_{uuid}.tif"
    object_name = get_object_name(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
    )
    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
    )

    if settings.PROVIDER == "gcp":
        gcs.upload_file_via_cli(object_name, final_raster)
    else:
        s3.upload_file_via_s3_client(object_name, final_raster)

    metadata = {
        "modules": {
            "climate_foresight": {
                "normalized_input": True,
                "run_id": run_id,
                "original_layer_id": input_layer.id,
                "transformation": transformation,
                "original_skew": float(original_skew),
                "transformed_skew": float(transformed_skew),
            }
        }
    }

    normalized_layer_name = f"{input_layer.name} (Normalized for CF Run {run_id})"

    datalayer_result = create_datalayer(
        name=normalized_layer_name,
        dataset=dataset,
        organization=organization,
        created_by=created_by,
        original_name=original_name,
        type=DataLayerType.RASTER,
        category=input_layer.category,
        metadata=metadata,
        status=DataLayerStatus.PENDING,
    )

    normalized_layer = datalayer_result["datalayer"]
    normalized_layer.url = storage_url
    normalized_layer.save()

    try:
        Path(temp_path).unlink(missing_ok=True)
        for processed_file in processed_files:
            Path(processed_file).unlink(missing_ok=True)
    except Exception as e:
        log.warning(f"Failed to clean up temp files: {e}")

    return {
        "datalayer": normalized_layer,
        "transformation_info": {
            "transformation": transformation,
            "original_skew": float(original_skew),
            "transformed_skew": float(transformed_skew),
        },
    }
