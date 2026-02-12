"""
Landscape-level rollup services for Climate Foresight.

Aggregates pillar rollups into landscape-level current and future rasters
for use in PROMOTe analysis.
"""

import logging
import tempfile
from pathlib import Path
from typing import Any, Dict, List
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
from django.db import IntegrityError
from gis.info import get_gdal_env, info_raster
from gis.rasters import to_planscape_streaming

from climate_foresight.future_climate import (
    get_default_future_climate_layer,
    map_pillars_to_future_layers,
)
from climate_foresight.models import (
    ClimateForesightPillarRollup,
    ClimateForesightPillarRollupStatus,
    ClimateForesightRun,
)
from climate_foresight.services import (
    clip_and_align_raster_to_grid,
    get_reference_grid_for_run,
)

log = logging.getLogger(__name__)


def aggregate_rasters_simple_average(
    raster_layers: List[DataLayer],
    output_name: str,
    organization_id: int,
    created_by: User,
) -> DataLayer:
    """
    Compute simple average of multiple rasters.

    All input rasters must have the same shape and extent.
    Processes block-by-block for memory efficiency.

    Args:
        raster_layers: List of DataLayers to average
        output_name: Name for the output DataLayer
        organization_id: Organization ID for storage
        created_by: User creating the layer

    Returns:
        Created DataLayer with averaged raster
    """
    if len(raster_layers) == 0:
        raise ValueError("Must provide at least one raster layer")

    if len(raster_layers) == 1:
        log.info("Single raster provided - returning as-is")
        return raster_layers[0]

    log.info(f"Averaging {len(raster_layers)} rasters: {output_name}")

    existing_layer = DataLayer.objects.filter(
        name=output_name,
        dataset=raster_layers[0].dataset,
        type=DataLayerType.RASTER,
    ).first()

    if existing_layer:
        log.info(
            f"DataLayer {existing_layer.name} already processed and created: (id={existing_layer.id})"
        )
        return existing_layer

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(raster_layers[0].url) as src:
            profile = src.profile.copy()
            nodata = src.nodata if src.nodata is not None else -9999

        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_file:
            temp_path = tmp_file.name

        profile.update(dtype=rasterio.float32, nodata=nodata)

        with rasterio.open(temp_path, "w", **profile) as dst:
            with rasterio.open(raster_layers[0].url) as src:
                for _, window in src.block_windows(1):
                    block_stack = []
                    for layer in raster_layers:
                        with rasterio.open(layer.url) as layer_src:
                            fill_value = (
                                layer_src.nodata
                                if layer_src.nodata is not None
                                else nodata
                            )
                            block_data = layer_src.read(
                                1,
                                window=window,
                                boundless=True,
                                fill_value=fill_value,
                            )
                            block_stack.append(block_data)

                    block_stack = np.array(block_stack, dtype=np.float32)

                    if nodata is not None:
                        valid_mask = np.all(block_stack != nodata, axis=0)
                    else:
                        valid_mask = np.all(~np.isnan(block_stack), axis=0)

                    output_block = np.full(
                        block_stack.shape[1:], nodata, dtype=np.float32
                    )

                    if np.any(valid_mask):
                        output_block[valid_mask] = np.mean(
                            block_stack[:, valid_mask], axis=0
                        )

                    dst.write(output_block, 1, window=window)

    uuid = str(uuid4())
    original_name = f"{output_name.replace(' ', '_')}_{uuid}.tif"

    storage_url = get_storage_url(
        organization_id=organization_id,
        uuid=uuid,
        original_name=original_name,
    )

    to_planscape_streaming(
        input_file=temp_path,
        output_file=storage_url,
    )

    existing_layer = DataLayer.objects.filter(
        name=output_name,
        dataset=raster_layers[0].dataset,
        type=DataLayerType.RASTER,
    ).first()

    if existing_layer:
        log.info(
            f"DataLayer {existing_layer.name} already processed and created: (id={existing_layer.id})"
            "Check tasks for race condition as first check did not find an existing layer.",
        )
        return existing_layer

    raster_info = info_raster(storage_url)

    metadata = {"modules": {"climate_foresight": {"landscape_aggregation": True}}}
    dataset = Dataset.objects.get(pk=settings.CLIMATE_FORESIGHT_DATASET_ID)

    try:
        datalayer_result = create_datalayer(
            name=output_name,
            dataset=dataset,
            organization=raster_layers[0].organization,
            created_by=created_by,
            original_name=original_name,
            type=DataLayerType.RASTER,  # type: ignore
            geometry_type=GeometryType.RASTER,  # type: ignore
            category=None,
            metadata=metadata,
            info=raster_info,
            status=DataLayerStatus.PENDING,
        )

        averaged_layer = datalayer_result["datalayer"]
        averaged_layer.url = storage_url
        averaged_layer.save()
    except IntegrityError:
        log.warning(
            f"IntegrityError creating layer '{output_name}'. "
            "Fetching existing layer created by concurrent task."
        )
        existing_layer = DataLayer.objects.filter(
            name=output_name,
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

    log.info(f"Created averaged layer {averaged_layer.id}: {output_name}")
    return averaged_layer


def rollup_landscape(
    run_id: int,
    created_by: User,
) -> Dict[str, Any]:
    """
    Rollup landscape-level current and future rasters for a Climate Foresight run.

    Process:
    1. Get all completed pillar rollups for the run
    2. Average pillar rollups → current_landscape raster
    3. Map pillars to future climate layers (with fallback to default)
    4. Clip future climate layers to planning area extent
    5. Average clipped future layers → future_landscape raster
    6. Align future landscape to match current landscape grid exactly

    Args:
        run_id: ID of the ClimateForesightRun
        created_by: User creating the landscape rollup

    Returns:
        Dictionary containing:
            - current_datalayer: Aggregated current conditions DataLayer
            - future_datalayer: Aggregated future conditions DataLayer (aligned to current)
            - future_mapping: Dict mapping pillar_id to future layer info
    """

    run = ClimateForesightRun.objects.get(pk=run_id)

    log.info(f"Starting landscape rollup for run {run.name} (id={run_id})")

    pillar_rollups = ClimateForesightPillarRollup.objects.filter(
        run=run, status=ClimateForesightPillarRollupStatus.COMPLETED
    ).select_related("pillar", "rollup_datalayer")

    # get all normalized input layers (includes both assigned and unassigned)
    normalized_inputs = run.input_datalayers.filter(
        normalized_datalayer__isnull=False
    ).select_related("normalized_datalayer", "pillar")

    if not normalized_inputs.exists():
        raise ValueError(
            f"No normalized input layers found for run {run.name}. "
            "Normalize input layers before running landscape aggregation."
        )

    log.info(f"Found {pillar_rollups.count()} completed pillar rollups")
    log.info(f"Found {normalized_inputs.count()} normalized input layers")

    current_layers = []
    pillar_names = []
    used_pillars = set()

    for pillar_rollup in pillar_rollups:
        if pillar_rollup.rollup_datalayer:
            current_layers.append(pillar_rollup.rollup_datalayer)
            pillar_names.append(pillar_rollup.pillar.name)
            used_pillars.add(pillar_rollup.pillar.id)

    unassigned_count = 0
    for input_layer in normalized_inputs:
        if input_layer.pillar_id is None:  # No pillar assignment
            current_layers.append(input_layer.normalized_datalayer)
            unassigned_count += 1
            log.info(
                f"Including unassigned layer: {input_layer.normalized_datalayer.name}"
            )

    log.info(
        f"Current conditions: {len(pillar_rollups)} pillar rollups + "
        f"{unassigned_count} unassigned layers = {len(current_layers)} total"
    )

    if not current_layers:
        raise ValueError("No valid current condition rasters found")

    log.info("Aggregating current conditions landscape...")
    current_landscape = aggregate_rasters_simple_average(
        raster_layers=current_layers,
        output_name=f"Current Conditions Landscape (CF Run {run_id})",
        organization_id=current_layers[0].organization.pk,
        created_by=created_by,
    )

    try:
        style = Style.objects.get(
            name="cf-current-conditions",
            type=DataLayerType.RASTER,
        )
        DataLayerHasStyle.objects.get_or_create(
            style=style,
            datalayer=current_landscape,
            defaults={"default": True},
        )
        log.info(
            f"Assigned 'cf-current-conditions' style to current landscape {current_landscape.id}"
        )
    except Style.DoesNotExist:
        log.warning(
            "Style 'cf-current-conditions' not found, skipping style assignment"
        )
    except Style.MultipleObjectsReturned:
        style = Style.objects.filter(
            name="cf-current-conditions",
            type=DataLayerType.RASTER,
        ).first()
        if style:
            DataLayerHasStyle.objects.get_or_create(
                style=style,
                datalayer=current_landscape,
                defaults={"default": True},
            )
            log.info(
                f"Assigned 'cf-current-conditions' style to current landscape {current_landscape.id}"
            )

    log.info("Mapping pillars to future climate layers...")
    future_mapping = map_pillars_to_future_layers(pillar_names)

    future_layer_ids = set()
    pillar_to_future = {}

    for idx, pillar_rollup in enumerate(pillar_rollups):
        pillar_name = pillar_names[idx]
        future_info = future_mapping.get(pillar_name, {})

        layer_id = future_info.get("layer_id")
        if layer_id:
            future_layer_ids.add(layer_id)
            pillar_to_future[str(pillar_rollup.pillar.id)] = future_info

    # for unassigned layers, use default future climate layer
    if unassigned_count > 0:
        default_future_layer = get_default_future_climate_layer()
        if default_future_layer:
            future_layer_ids.add(default_future_layer.id)
            log.info(
                f"Using default future climate layer for {unassigned_count} "
                f"unassigned layers: {default_future_layer.name} (id={default_future_layer.id})"
            )
        else:
            log.warning(
                f"{unassigned_count} unassigned layers but no default future climate layer found"
            )

    if not future_layer_ids:
        raise ValueError(
            "No future climate layers found. "
            "Ensure 'Future Climate Conditions' category exists with layers."
        )

    future_layers = list(
        DataLayer.objects.filter(id__in=future_layer_ids).order_by("id")
    )

    log.info(f"Found {len(future_layers)} unique future climate layers")

    log.info("Clipping future climate layers to planning area...")
    planning_area_geometry = run.planning_area.geometry
    clipped_future_layers = []

    climate_foresight_dataset = Dataset.objects.get(
        pk=settings.CLIMATE_FORESIGHT_DATASET_ID
    )

    ref_transform, ref_width, ref_height, ref_nodata = get_reference_grid_for_run(
        run_id, planning_area_geometry
    )

    for future_layer in future_layers:
        clipped_name = (
            f"{future_layer.name} (Clipped for PA {run.planning_area.id}/{run_id})"
        )

        existing_clipped = DataLayer.objects.filter(
            name=clipped_name,
            dataset=climate_foresight_dataset,
            type=DataLayerType.RASTER,
        ).first()

        if existing_clipped:
            log.info(
                f"Using existing clipped future climate layer: {clipped_name} "
                f"(id={existing_clipped.id})"
            )
            clipped_future_layers.append(existing_clipped)
            continue

        log.info(
            f"Clipping future climate layer {future_layer.id} ({future_layer.name})"
        )

        with rasterio.Env(**get_gdal_env()):
            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
                temp_clipped_path = tmp.name

            try:
                aligned_data = clip_and_align_raster_to_grid(
                    source_url=future_layer.url,
                    planning_area_geometry=planning_area_geometry,
                    ref_transform=ref_transform,
                    ref_width=ref_width,
                    ref_height=ref_height,
                    ref_nodata=ref_nodata,
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

                log.info(f"Aligned to reference grid shape ({ref_height}, {ref_width})")

                uuid = str(uuid4())
                original_name = f"{clipped_name.replace(' ', '_')}_{uuid}.tif"

                storage_url = get_storage_url(
                    organization_id=future_layer.organization.pk,
                    uuid=uuid,
                    original_name=original_name,
                )

                to_planscape_streaming(
                    input_file=temp_clipped_path,
                    output_file=storage_url,
                )

                raster_info = info_raster(storage_url)

                existing_clipped_late = DataLayer.objects.filter(
                    name=clipped_name,
                    dataset=future_layer.dataset,
                    type=DataLayerType.RASTER,
                ).first()

                if existing_clipped_late:
                    log.warning(
                        f"Found existing clipped future climate layer '{clipped_name}' "
                        f"(id={existing_clipped_late.id}) right before creation. Using it instead."
                    )
                    try:
                        Path(temp_clipped_path).unlink(missing_ok=True)
                    except Exception as e:
                        log.warning(f"Failed to clean up temp file: {e}")

                    clipped_future_layers.append(existing_clipped_late)
                    continue

                metadata = {
                    "modules": {
                        "climate_foresight": {
                            "clipped_from": future_layer.id,
                            "planning_area_id": run.planning_area.id,
                            "run_id": run_id,
                        }
                    }
                }

                try:
                    datalayer_result = create_datalayer(
                        name=clipped_name,
                        dataset=climate_foresight_dataset,
                        organization=future_layer.organization,
                        created_by=created_by,
                        original_name=original_name,
                        type=DataLayerType.RASTER,  # type: ignore
                        geometry_type=GeometryType.RASTER,  # type: ignore
                        category=None,
                        metadata=metadata,
                        info=raster_info,
                        status=DataLayerStatus.READY,
                    )

                    clipped_layer = datalayer_result["datalayer"]
                    clipped_layer.url = storage_url
                    clipped_layer.save()

                    log.info(
                        f"Created clipped future climate layer {clipped_layer.id}: "
                        f"{clipped_name}"
                    )

                    clipped_future_layers.append(clipped_layer)
                except IntegrityError:
                    # Race condition: another task created the layer
                    log.warning(
                        f"IntegrityError creating clipped layer '{clipped_name}'. "
                        "Fetching existing layer created by concurrent task."
                    )
                    existing_layer = DataLayer.objects.filter(
                        name=clipped_name,
                        dataset=climate_foresight_dataset,
                        type=DataLayerType.RASTER,
                    ).first()

                    if existing_layer:
                        clipped_future_layers.append(existing_layer)
                    else:
                        raise

            finally:
                try:
                    Path(temp_clipped_path).unlink(missing_ok=True)
                except Exception as e:
                    log.warning(f"Failed to clean up temp file: {e}")

    log.info("Aggregating future conditions landscape...")
    future_landscape_temp = aggregate_rasters_simple_average(
        raster_layers=clipped_future_layers,
        output_name=f"Future Conditions Landscape (CF Run {run_id})",
        organization_id=current_layers[0].organization.pk,
        created_by=created_by,
    )

    log.info("Aligning current and future landscapes to common grid...")

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(current_landscape.url) as current_src:
            current_profile = current_src.profile.copy()
            current_transform = current_src.transform
            current_shape = (current_profile["height"], current_profile["width"])
            current_nodata = (
                current_src.nodata if current_src.nodata is not None else -9999
            )
            current_res_x = abs(current_transform.a)
            current_res_y = abs(current_transform.e)
            current_resolution = (current_res_x + current_res_y) / 2

        with rasterio.open(future_landscape_temp.url) as future_src:
            future_profile = future_src.profile.copy()
            future_transform = future_src.transform
            future_shape = (future_profile["height"], future_profile["width"])
            future_nodata = (
                future_src.nodata if future_src.nodata is not None else -9999
            )
            future_res_x = abs(future_transform.a)
            future_res_y = abs(future_transform.e)
            future_resolution = (future_res_x + future_res_y) / 2

        log.info(
            f"Current landscape: shape={current_shape}, resolution={current_resolution:.8f} degrees"
        )
        log.info(
            f"Future landscape: shape={future_shape}, resolution={future_resolution:.8f} degrees"
        )

        resolution_tolerance = 1e-9
        if abs(current_resolution - future_resolution) < resolution_tolerance:
            use_current_as_reference = True
            log.info(
                "Resolutions are equal - using current landscape as reference grid"
            )
        elif current_resolution < future_resolution:
            use_current_as_reference = True
            log.info(
                f"Current landscape has finer resolution ({current_resolution:.8f} < {future_resolution:.8f}) - "
                f"using current as reference grid"
            )
        else:
            use_current_as_reference = False
            log.info(
                f"Future landscape has finer resolution ({future_resolution:.8f} < {current_resolution:.8f}) - "
                f"using future as reference grid, will resample current"
            )

        if use_current_as_reference:
            reference_shape = current_shape
            reference_nodata = current_nodata
            reference_profile = current_profile.copy()

            with rasterio.open(current_landscape.url) as current_src:
                current_data = current_src.read(1)
                current_valid_mask = current_data != current_nodata

            with rasterio.open(future_landscape_temp.url) as future_src:
                future_data = future_src.read(
                    1,
                    out_shape=reference_shape,
                    resampling=rasterio.enums.Resampling.bilinear,
                )
                log.info(
                    f"Resampled future landscape from {future_src.shape} to {reference_shape}"
                )

            future_data[~current_valid_mask] = reference_nodata
            log.info("Applied current landscape nodata mask to future landscape")

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
                temp_aligned_path = tmp.name

            try:
                aligned_profile = reference_profile.copy()
                aligned_profile.update(dtype=rasterio.float32, nodata=reference_nodata)

                with rasterio.open(temp_aligned_path, "w", **aligned_profile) as dst:
                    dst.write(future_data.astype(np.float32), 1)

                uuid_str = str(uuid4())
                aligned_name = f"Future_Conditions_Landscape_Aligned_{uuid_str}.tif"
                aligned_storage_url = get_storage_url(
                    organization_id=current_layers[0].organization.pk,
                    uuid=uuid_str,
                    original_name=aligned_name,
                )

                to_planscape_streaming(
                    input_file=temp_aligned_path,
                    output_file=aligned_storage_url,
                )

                raster_info = info_raster(aligned_storage_url)

                future_landscape_temp.url = aligned_storage_url
                future_landscape_temp.info = raster_info
                future_landscape_temp.save()

                log.info(
                    f"Updated future landscape {future_landscape_temp.id} with aligned raster"
                )

            finally:
                try:
                    Path(temp_aligned_path).unlink(missing_ok=True)
                except Exception as e:
                    log.warning(f"Failed to clean up temp file: {e}")

        else:
            reference_shape = future_shape
            reference_nodata = future_nodata
            reference_profile = future_profile.copy()

            with rasterio.open(future_landscape_temp.url) as future_src:
                future_data = future_src.read(1)
                future_valid_mask = future_data != future_nodata

            with rasterio.open(current_landscape.url) as current_src:
                current_data = current_src.read(
                    1,
                    out_shape=reference_shape,
                    resampling=rasterio.enums.Resampling.bilinear,
                )
                log.info(
                    f"Resampled current landscape from {current_src.shape} to {reference_shape}"
                )

            current_resampled_valid = current_data != current_nodata
            combined_valid_mask = current_resampled_valid & future_valid_mask

            current_data[~combined_valid_mask] = reference_nodata
            future_data[~combined_valid_mask] = reference_nodata
            log.info("Applied combined valid mask to both landscapes")

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
                temp_current_aligned_path = tmp.name

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
                temp_future_aligned_path = tmp.name

            try:
                aligned_profile = reference_profile.copy()
                aligned_profile.update(dtype=rasterio.float32, nodata=reference_nodata)

                with rasterio.open(
                    temp_current_aligned_path, "w", **aligned_profile
                ) as dst:
                    dst.write(current_data.astype(np.float32), 1)

                with rasterio.open(
                    temp_future_aligned_path, "w", **aligned_profile
                ) as dst:
                    dst.write(future_data.astype(np.float32), 1)

                uuid_current = str(uuid4())
                current_aligned_name = (
                    f"Current_Conditions_Landscape_Aligned_{uuid_current}.tif"
                )
                current_aligned_storage_url = get_storage_url(
                    organization_id=current_layers[0].organization.pk,
                    uuid=uuid_current,
                    original_name=current_aligned_name,
                )

                to_planscape_streaming(
                    input_file=temp_current_aligned_path,
                    output_file=current_aligned_storage_url,
                )

                current_raster_info = info_raster(current_aligned_storage_url)

                current_landscape.url = current_aligned_storage_url
                current_landscape.info = current_raster_info
                current_landscape.save()

                log.info(
                    f"Updated current landscape {current_landscape.id} with aligned raster "
                    f"(upsampled to finer resolution)"
                )

                uuid_future = str(uuid4())
                future_aligned_name = (
                    f"Future_Conditions_Landscape_Aligned_{uuid_future}.tif"
                )
                future_aligned_storage_url = get_storage_url(
                    organization_id=current_layers[0].organization.pk,
                    uuid=uuid_future,
                    original_name=future_aligned_name,
                )

                to_planscape_streaming(
                    input_file=temp_future_aligned_path,
                    output_file=future_aligned_storage_url,
                )

                future_raster_info = info_raster(future_aligned_storage_url)

                future_landscape_temp.url = future_aligned_storage_url
                future_landscape_temp.info = future_raster_info
                future_landscape_temp.save()

                log.info(
                    f"Updated future landscape {future_landscape_temp.id} with aligned raster"
                )

            finally:
                try:
                    Path(temp_current_aligned_path).unlink(missing_ok=True)
                    Path(temp_future_aligned_path).unlink(missing_ok=True)
                except Exception as e:
                    log.warning(f"Failed to clean up temp files: {e}")

    log.info(
        f"Successfully created landscape rollup: "
        f"current={current_landscape.id}, future={future_landscape_temp.id}"
    )

    return {
        "current_datalayer": current_landscape,
        "future_datalayer": future_landscape_temp,
        "future_mapping": pillar_to_future,
    }
