"""
PROMOTe analysis for Climate Foresight.

Implements the Monitor, Protect, Adapt, Transform (MPAT) framework
based on Povak et al (2024): https://www.frontiersin.org/articles/10.3389/ffgc.2024.1286937/full

PROMOTe calculates management strategy support scores based on current and future
landscape conditions in 2D space.
"""

import logging
import tempfile
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

import numpy as np
import rasterio
from datasets.models import (
    DataLayer,
    DataLayerHasStyle,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    GeometryType,
    Style,
)
from datasets.services import create_datalayer, get_storage_url
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import MultiPolygon
from django.db import IntegrityError
from gis.info import get_gdal_env, info_raster
from gis.rasters import to_planscape_streaming

log = logging.getLogger(__name__)


def rescale_linear(
    values: np.ndarray,
    from_min: float,
    from_max: float,
    to_min: float = 0.0,
    to_max: float = 100.0,
) -> np.ndarray:
    """
    Linear rescaling of values from one range to another.

    Args:
        values: Input values
        from_min: Original minimum
        from_max: Original maximum
        to_min: Target minimum (default 0)
        to_max: Target maximum (default 100)

    Returns:
        Rescaled values
    """
    log.info(
        f"rescale_linear: from=[{from_min}, {from_max}], to=[{to_min}, {to_max}], "
        f"input range=[{np.min(values)}, {np.max(values)}]"
    )

    if from_max == from_min:
        result = np.full_like(values, (to_min + to_max) / 2, dtype=np.float32)
        log.info(
            f"rescale_linear: from_max == from_min, returning constant {(to_min + to_max) / 2}"
        )
        return result

    scaled = ((values - from_min) / (from_max - from_min)) * (to_max - to_min) + to_min

    clip_min = min(to_min, to_max)
    clip_max = max(to_min, to_max)
    result = np.clip(scaled, clip_min, clip_max).astype(np.float32)

    log.info(
        f"rescale_linear: output range=[{np.min(result)}, {np.max(result)}], "
        f"mean={np.mean(result)}"
    )

    return result


def calculate_promote_strategy_score(
    current: np.ndarray,
    future: np.ndarray,
    target_x: float,
    target_y: float,
) -> np.ndarray:
    """
    Calculate PROMOTe strategy score using Euclidean distance in 2D space.

    Each cell's position in (current, future) space is compared to the target
    position representing maximum support for a management strategy.

    The Euclidean distance is then rescaled so that:
    - Distance 0 (at target corner) = 100 (full support)
    - Distance sqrt(20000) (opposite corner) = 0 (no support)

    Args:
        current: Current condition values (0-100)
        future: Future condition values (0-100)
        target_x: Target current value for this strategy
        target_y: Target future value for this strategy

    Returns:
        Strategy support scores (0-100)
    """
    log.info(
        f"calculate_promote_strategy_score called with target=({target_x}, {target_y}), "
        f"current range=[{np.min(current)}, {np.max(current)}], "
        f"future range=[{np.min(future)}, {np.max(future)}]"
    )

    # euclidean distance from each cell to target corner
    distance = np.sqrt((current - target_x) ** 2 + (future - target_y) ** 2)

    log.info(
        f"Calculated distances - min: {np.min(distance)}, "
        f"max: {np.max(distance)}, mean: {np.mean(distance)}"
    )

    # rescale: distance 0 → score 100, distance sqrt(20000) → score 0
    max_distance = np.sqrt(20000)  # maximum distance in 100x100 space
    log.info(f"Max distance for rescaling: {max_distance}")

    score = rescale_linear(distance, 0, max_distance, 100, 0)

    log.info(
        f"Calculated scores - min: {np.min(score)}, "
        f"max: {np.max(score)}, mean: {np.mean(score)}"
    )

    return score


def run_promote_analysis(
    run_id: int,
    current_layer: DataLayer,
    future_layer: DataLayer,
    created_by: User,
    planning_area_geometry: MultiPolygon,
) -> Dict[str, Any]:
    """
    Run PROMOTe analysis to generate MPAT strategy scores and outputs.

    Strategy Definitions (corners of 2D space):
    - Monitor (100, 100): Good now, good future → maintain
    - Protect (100, 0): Good now, poor future → protect from change
    - Adapt (0, 100): Poor now, good future → adapt to improve
    - Transform (0, 0): Poor now, poor future → transform completely

    Args:
        run_id: ID of the ClimateForesightRun
        current_layer: Current conditions landscape raster (0-100)
        future_layer: Future conditions landscape raster (0-100)
        created_by: User creating the analysis
        planning_area_geometry: MultiPolygon to clip the output rasters to (in EPSG:4269)

    Returns:
        Dictionary containing all PROMOTe output DataLayers:
            - monitor_datalayer: Monitor strategy score
            - protect_datalayer: Protect strategy score
            - adapt_datalayer: Adapt strategy score
            - transform_datalayer: Transform strategy score
            - adapt_protect_datalayer: Adapt-Protect score (rescaled)
            - integrated_condition_score_datalayer: ICS
            - mpat_matrix_datalayer: Categorical MPAT (1=M, 2=P, 3=A, 4=T)
            - mpat_strength_datalayer: MPAT with strength (weak/strong)
    """
    log.info(
        f"Starting PROMOTe analysis for run {run_id}: "
        f"current={current_layer.id}, future={future_layer.id}"
    )

    dataset = Dataset.objects.get(pk=settings.CLIMATE_FORESIGHT_DATASET_ID)

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(current_layer.url) as current_src:
            current_data = current_src.read(1).astype(np.float32)
            profile = current_src.profile.copy()
            nodata = current_src.nodata if current_src.nodata is not None else -9999

        with rasterio.open(future_layer.url) as future_src:
            future_data = future_src.read(1).astype(np.float32)
            future_nodata = (
                future_src.nodata if future_src.nodata is not None else -9999
            )

        if current_data.shape != future_data.shape:
            raise ValueError(
                f"Current and future rasters must have the same shape. "
                f"Got current={current_data.shape}, future={future_data.shape}"
            )

        profile.update(dtype=rasterio.float32, nodata=nodata)

        valid_mask = (current_data != nodata) & (future_data != future_nodata)

        # initialize MPAT scores
        monitor = np.full_like(current_data, nodata, dtype=np.float32)
        protect = np.full_like(current_data, nodata, dtype=np.float32)
        adapt = np.full_like(current_data, nodata, dtype=np.float32)
        transform = np.full_like(current_data, nodata, dtype=np.float32)

        current_scaled = np.full_like(current_data, nodata, dtype=np.float32)

        if np.any(valid_mask):
            current_valid = current_data[valid_mask].astype(np.float32)
            future_valid = future_data[valid_mask].astype(np.float32)

            future_min = np.min(future_valid)
            future_max = np.max(future_valid)

            # ensure future values are within 0-100 range
            if future_min >= 0 and future_max <= 1.0:
                future_valid = future_valid * 100.0
            elif future_min >= 0 and future_max <= 100.0:
                pass
            elif future_min >= 0 and future_max <= 255.0:
                future_valid = rescale_linear(future_valid, 0, 255, 0, 100)
            else:
                future_valid = rescale_linear(
                    future_valid, future_min, future_max, 0, 100
                )

            current_valid = np.clip(current_valid, 0, 100)
            future_valid = np.clip(future_valid, 0, 100)

            current_scaled[valid_mask] = current_valid

            # Calculate strategy scores for valid pixels
            # Monitor = good current, good future (100, 100)
            monitor[valid_mask] = calculate_promote_strategy_score(
                current_valid, future_valid, 100, 100
            )

            # Protect = good current, poor future (100, 0)
            protect[valid_mask] = calculate_promote_strategy_score(
                current_valid, future_valid, 100, 0
            )

            # Adapt = poor current, good future (0, 100)
            adapt[valid_mask] = calculate_promote_strategy_score(
                current_valid, future_valid, 0, 100
            )

            # Transform = poor current, poor future (0, 0)
            transform[valid_mask] = calculate_promote_strategy_score(
                current_valid, future_valid, 0, 0
            )

        log.info("Calculated MPAT strategy scores")

        # calculate Adapt-Protect score (max of adapt and protect)
        adapt_protect = np.full_like(current_data, nodata, dtype=np.float32)
        if np.any(valid_mask):
            adapt_protect[valid_mask] = np.maximum(
                adapt[valid_mask], protect[valid_mask]
            )

        # rescale Adapt-Protect from ~29-100 to 0-100
        # (taking max means minimum possible value is ~29.29, not 0)
        adapt_protect_rescaled = np.full_like(current_data, nodata, dtype=np.float32)
        if np.any(valid_mask):
            ap_valid = adapt_protect[valid_mask]
            adapt_protect_rescaled[valid_mask] = rescale_linear(
                ap_valid, 29.28932, 100, 0, 100
            )

        # initialize MPAT matrix - using 255 since it's far outside the valid range of 1-4 and 11-42
        uint8_nodata = 255
        mpat_matrix = np.full(current_data.shape, uint8_nodata, dtype=np.uint8)
        mpat_strength = np.full(current_data.shape, uint8_nodata, dtype=np.uint8)

        if np.any(valid_mask):
            # stack all strategy scores
            strategy_stack = np.stack(
                [
                    monitor[valid_mask],
                    protect[valid_mask],
                    adapt[valid_mask],
                    transform[valid_mask],
                ],
                axis=0,
            )

            # find strategy with max score (1=Monitor, 2=Protect, 3=Adapt, 4=Transform)
            max_strategy = np.argmax(strategy_stack, axis=0) + 1
            max_score = np.max(strategy_stack, axis=0)

            mpat_matrix[valid_mask] = max_strategy.astype(np.uint8)

            # add strength designation (weak < 60, strong >= 60)
            mpat_strength[valid_mask] = (max_strategy * 10).astype(np.uint8)
            strong_mask = valid_mask.copy()
            strong_mask[valid_mask] = max_score >= 60
            mpat_strength[strong_mask] += 1  # add 1 for strong

        log.info("Calculated MPAT Matrix and strength")

        # calculate Integrated Condition Score
        # ICS = average of current and monitor, with piecewise rescaling
        ics = np.full_like(current_data, nodata, dtype=np.float32)
        if np.any(valid_mask):
            avg = (current_scaled[valid_mask] + monitor[valid_mask]) / 2.0

            # Piecewise rescaling
            # <= 10 → 0
            # >= 85 → 100
            # 10-85 → linear rescale to 0-100
            ics_valid = np.where(
                avg <= 10,
                0,
                np.where(avg >= 85, 100, rescale_linear(avg, 10, 85, 0, 100)),
            )
            ics[valid_mask] = ics_valid

        log.info("Calculated Integrated Condition Score")

        profile.update(dtype=rasterio.float32, nodata=nodata)

        def save_raster(
            data: np.ndarray,
            name: str,
            dtype=rasterio.float32,
            style_name: str | None = None,
        ) -> DataLayer:
            """Helper to save a raster as a DataLayer.

            Args:
                data: Raster data array
                name: Display name for the layer
                dtype: Raster data type
                style_name: Optional name of the Style to assign (e.g., 'cf-mpat-matrix')
            """
            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
                temp_path = tmp.name

            profile_copy = profile.copy()
            raster_nodata = nodata if dtype == rasterio.float32 else uint8_nodata
            profile_copy.update(dtype=dtype, nodata=raster_nodata)

            with rasterio.open(temp_path, "w", **profile_copy) as dst:
                dst.write(data, 1)

            uuid = str(uuid4())
            original_name = f"{name.replace(' ', '_')}_{uuid}.tif"
            storage_url = get_storage_url(
                organization_id=current_layer.organization.pk,
                uuid=uuid,
                original_name=original_name,
            )

            to_planscape_streaming(temp_path, storage_url)

            raster_info = info_raster(storage_url)

            metadata = {
                "modules": {
                    "climate_foresight": {
                        "enabled": True,
                        "promote_output": True,
                        "run_id": run_id,
                        "output_type": name,
                    }
                }
            }

            layer_name = f"{name} (CF Run {run_id})"

            try:
                result = create_datalayer(
                    name=layer_name,
                    dataset=dataset,
                    organization=current_layer.organization,
                    created_by=created_by,
                    original_name=original_name,
                    type=DataLayerType.RASTER,  # type: ignore
                    geometry_type=GeometryType.RASTER,  # type: ignore
                    category=None,
                    metadata=metadata,
                    info=raster_info,
                    status=DataLayerStatus.PENDING,
                )

                layer = result["datalayer"]
                layer.url = storage_url
                layer.save()

                if style_name:
                    try:
                        style = Style.objects.get(
                            name=style_name,
                            type=DataLayerType.RASTER,
                        )
                        DataLayerHasStyle.objects.create(
                            style=style,
                            datalayer=layer,
                            default=True,
                        )
                        log.info(f"Assigned style '{style_name}' to layer {layer.id}")
                    except Style.DoesNotExist:
                        log.warning(
                            f"Style '{style_name}' not found, skipping style assignment"
                        )
                    except Style.MultipleObjectsReturned:
                        style = Style.objects.filter(
                            name=style_name,
                            type=DataLayerType.RASTER,
                        ).first()
                        if style:
                            DataLayerHasStyle.objects.create(
                                style=style,
                                datalayer=layer,
                                default=True,
                            )
                            log.info(
                                f"Assigned style '{style_name}' to layer {layer.id}"
                            )

            except IntegrityError:
                # Race condition: another task created the layer
                log.warning(
                    f"IntegrityError creating layer '{layer_name}'. "
                    "Fetching existing layer created by concurrent task."
                )
                existing_layer = DataLayer.objects.filter(
                    name=layer_name,
                    dataset=dataset,
                    type=DataLayerType.RASTER,
                ).first()

                if existing_layer:
                    try:
                        Path(temp_path).unlink(missing_ok=True)
                    except Exception as e:
                        log.warning(f"Failed to clean up temp file: {e}")
                    return existing_layer
                else:
                    raise

            try:
                Path(temp_path).unlink(missing_ok=True)
            except Exception as e:
                log.warning(f"Failed to clean up temp file: {e}")

            log.info(f"Created {name} layer (id={layer.id})")
            return layer

        outputs = {
            "monitor_datalayer": save_raster(monitor, "Monitor Score"),
            "protect_datalayer": save_raster(protect, "Protect Score"),
            "adapt_datalayer": save_raster(adapt, "Adapt Score"),
            "transform_datalayer": save_raster(transform, "Transform Score"),
            "adapt_protect_datalayer": save_raster(
                adapt_protect_rescaled,
                "Adapt-Protect Score",
                style_name="cf-adapt-protect-score",
            ),
            "integrated_condition_score_datalayer": save_raster(
                ics,
                "Integrated Condition Score",
                style_name="cf-integrated-condition-score",
            ),
            "mpat_matrix_datalayer": save_raster(
                mpat_matrix, "MPAT Matrix", dtype=rasterio.uint8
            ),
            "mpat_strength_datalayer": save_raster(
                mpat_strength,
                "MPAT Strength",
                dtype=rasterio.uint8,
                style_name="cf-mpat-matrix",
            ),
        }

        log.info(f"Successfully completed PROMOTe analysis for run {run_id}")
        return outputs
