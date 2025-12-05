import logging
from typing import Optional
from django.db import transaction

from datasets.models import DataLayer
from climate_foresight.models import (
    ClimateForesightRunInputDataLayer,
    InputDataLayerStatus,
    ClimateForesightPillarRollup,
    ClimateForesightPillarRollupStatus,
)
from climate_foresight.services import (
    calculate_layer_statistics,
    normalize_raster_layer,
    rollup_pillar,
)
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task(
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def calculate_climate_foresight_layer_statistics(input_datalayer_id: int) -> None:
    """
    Calculate statistics for a climate foresight input data layer.

    This is a lightweight operation that calculates basic statistics (min, max, mean, std),
    percentiles (p5, p10, p90, p95), and statistical outlier bounds using MAD for frontend
    visualization. Uses downsampled data for performance.

    Args:
        input_datalayer_id: ID of the ClimateForesightRunInputDataLayer to analyze
    """
    try:
        input_dl = ClimateForesightRunInputDataLayer.objects.select_related(
            "datalayer", "run", "run__planning_area"
        ).get(pk=input_datalayer_id)

        log.info(
            f"Starting percentile calculation for input layer {input_dl.id} "
            f"(datalayer {input_dl.datalayer.id})"
        )

        if input_dl.statistics is not None:
            return

        planning_area_geometry = input_dl.run.planning_area.geometry

        result = calculate_layer_statistics(
            input_layer=input_dl.datalayer,
            planning_area_geometry=planning_area_geometry,
        )

        with transaction.atomic():
            input_dl.statistics = {"original": result["statistics"]}
            input_dl.save()

        stats = result["statistics"]
        log.info(
            f"Successfully calculated statistics for input layer {input_dl.id}. "
            f"Stats: min={stats['min']:.2f}, max={stats['max']:.2f}, "
            f"percentiles={stats['percentiles']}"
        )

    except ClimateForesightRunInputDataLayer.DoesNotExist:
        log.error(f"Input data layer {input_datalayer_id} does not exist")
        raise

    except Exception as e:
        log.exception(
            f"Failed to calculate statistics for input layer {input_datalayer_id}: {str(e)}"
        )
        raise


@app.task(
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def normalize_climate_foresight_input_layer(input_datalayer_id: int) -> Optional[int]:
    """
    Normalize a climate foresight input data layer asynchronously.

    This task:
    1. Reads the original raster
    2. Clips the raster to the planning area
    3. Applies auto-normalization
    4. Creates a new normalized DataLayer
    5. Links it to the ClimateForesightRunInputDataLayer

    NOTE: This task should be chained with datalayer_uploaded to process the
    normalized layer (COG conversion, hash calculation, etc.)

    Example:
        from celery import chain
        from datasets.tasks import datalayer_uploaded
        from datasets.models import DataLayerStatus

        chain(
            normalize_climate_foresight_input_layer.si(input_dl_id),
            datalayer_uploaded.si(status=DataLayerStatus.READY)
        ).apply_async()

    Args:
        input_datalayer_id: ID of the ClimateForesightRunInputDataLayer to normalize

    Returns:
        int: ID of the created normalized DataLayer
    """
    try:
        input_dl = ClimateForesightRunInputDataLayer.objects.select_related(
            "datalayer", "run", "run__planning_area"
        ).get(pk=input_datalayer_id)

        log.info(
            f"Starting normalization for input layer {input_dl.id} "
            f"(datalayer {input_dl.datalayer.id})"
        )

        if input_dl.status == InputDataLayerStatus.RUNNING:
            log.warning(
                f"Input layer {input_dl.id} normalization is already running. Skipping."
            )
            return (
                input_dl.normalized_datalayer.id
                if input_dl.normalized_datalayer
                else None
            )

        if (
            input_dl.status == InputDataLayerStatus.COMPLETED
            and input_dl.normalized_datalayer
        ):
            log.warning(
                f"Input layer {input_dl.id} already has a normalized layer "
                f"({input_dl.normalized_datalayer.id}). Skipping."
            )
            return input_dl.normalized_datalayer.id

        with transaction.atomic():
            input_dl.status = InputDataLayerStatus.RUNNING
            input_dl.save()

        # check if a normalized datalayer already exists with this name (could be from a previous failed processing)
        normalized_layer_name = (
            f"{input_dl.datalayer.name} (Normalized for CF Run {input_dl.run.id})"
        )
        existing_normalized = DataLayer.objects.filter(
            dataset=input_dl.datalayer.dataset,
            name=normalized_layer_name,
            type=input_dl.datalayer.type,
        ).first()

        if existing_normalized:
            log.warning(
                f"Found existing normalized datalayer '{normalized_layer_name}' "
                f"(id={existing_normalized.id}) that wasn't linked. Linking it now."
            )
            input_dl.normalized_datalayer = existing_normalized
            input_dl.save()
            return existing_normalized.id

        planning_area_geometry = input_dl.run.planning_area.geometry

        if input_dl.favor_high is None:
            # landing here implies the run bypassed favorability assignment
            raise ValueError(
                f"Input layer {input_dl.id} must have favor_high set before normalization"
            )

        result = normalize_raster_layer(
            input_layer=input_dl.datalayer,
            run_id=input_dl.run.id,
            created_by=input_dl.run.created_by,
            planning_area_geometry=planning_area_geometry,
            favor_high=input_dl.favor_high,
        )

        normalized_layer = result["datalayer"]
        normalization_info = result["normalization_info"]

        with transaction.atomic():
            input_dl.normalized_datalayer = normalized_layer

            if input_dl.statistics is None:
                input_dl.statistics = {}

            # migrate old format into original key, this can be removed once we're sure all runs have been migrated
            if "original" not in input_dl.statistics and any(
                k in input_dl.statistics for k in ["min", "max", "mean"]
            ):
                input_dl.statistics = {"original": input_dl.statistics}

            input_dl.statistics["normalization"] = normalization_info
            input_dl.status = InputDataLayerStatus.COMPLETED

            input_dl.save()

        log.info(
            f"Linked normalized layer {normalized_layer.id} to input layer {input_dl.id}"
        )

        log.info(
            f"Successfully normalized input layer {input_dl.id}. "
            f"Function: {normalization_info['function']}, "
            f"Endpoints: {normalization_info['endpoints']}, "
            f"Method: {normalization_info['endpoints_method']}, "
            f"Favor high: {input_dl.favor_high}"
        )

        return normalized_layer.pk

    except ClimateForesightRunInputDataLayer.DoesNotExist:
        log.error(f"Input data layer {input_datalayer_id} does not exist")
        raise

    except Exception as e:
        try:
            input_dl = ClimateForesightRunInputDataLayer.objects.get(
                pk=input_datalayer_id
            )
            input_dl.status = InputDataLayerStatus.FAILED
            input_dl.save()
        except Exception:
            pass

        log.exception(f"Failed to normalize input layer {input_datalayer_id}: {str(e)}")
        raise


@app.task(
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def rollup_climate_foresight_pillar(pillar_rollup_id: int) -> int:
    """
    Rollup (aggregate) normalized metrics to a pillar score asynchronously.

    This task:
    1. Gets all normalized layers assigned to the pillar in the run
    2. Calculates optimized weights (or equal weights)
    3. Computes weighted average of normalized rasters
    4. Creates a new DataLayer with the pillar rollup raster
    5. Updates the ClimateForesightPillarRollup record with results

    NOTE: This task should be chained with datalayer_uploaded to process the
    rollup layer (COG conversion, hash calculation, etc.)

    Example:
        from celery import chain
        from datasets.tasks import datalayer_uploaded
        from datasets.models import DataLayerStatus

        chain(
            rollup_climate_foresight_pillar.si(pillar_rollup_id),
            datalayer_uploaded.si(status=DataLayerStatus.READY)
        ).apply_async()

    Args:
        pillar_rollup_id: ID of the ClimateForesightPillarRollup to process

    Returns:
        int: ID of the created rollup DataLayer
    """
    try:
        pillar_rollup_obj = ClimateForesightPillarRollup.objects.select_related(
            "run", "run__created_by", "run__planning_area", "pillar"
        ).get(pk=pillar_rollup_id)

        log.info(
            f"Starting pillar rollup task for rollup {pillar_rollup_id} "
            f"(run={pillar_rollup_obj.run.id}, pillar={pillar_rollup_obj.pillar.id})"
        )

        if pillar_rollup_obj.rollup_datalayer:
            log.warning(
                f"Pillar rollup {pillar_rollup_id} already has a rollup layer "
                f"({pillar_rollup_obj.rollup_datalayer.id}). Skipping."
            )
            return pillar_rollup_obj.rollup_datalayer.id

        with transaction.atomic():
            pillar_rollup_obj.status = ClimateForesightPillarRollupStatus.RUNNING
            pillar_rollup_obj.save()

        result = rollup_pillar(
            run_id=pillar_rollup_obj.run.id,
            pillar_id=pillar_rollup_obj.pillar.id,
            created_by=pillar_rollup_obj.run.created_by,
            method=pillar_rollup_obj.method,
        )

        rollup_layer = result["datalayer"]
        weights = result["weights"]
        correlation_scores = result["correlation_scores"]
        method = result["method"]

        with transaction.atomic():
            pillar_rollup_obj.rollup_datalayer = rollup_layer
            pillar_rollup_obj.weights = {
                "weights": weights,
                "correlation_scores": correlation_scores,
                "method": method,
            }
            pillar_rollup_obj.status = ClimateForesightPillarRollupStatus.COMPLETED
            pillar_rollup_obj.save()

        log.info(
            f"Successfully completed pillar rollup {pillar_rollup_id}. "
            f"Rollup layer: {rollup_layer.id}, method: {method}"
        )

        return rollup_layer.pk

    except ClimateForesightPillarRollup.DoesNotExist:
        log.error(f"Pillar rollup {pillar_rollup_id} does not exist")
        raise

    except Exception as e:
        try:
            pillar_rollup_obj = ClimateForesightPillarRollup.objects.get(
                pk=pillar_rollup_id
            )
            pillar_rollup_obj.status = ClimateForesightPillarRollupStatus.FAILED
            pillar_rollup_obj.save()
        except Exception:
            pass

        log.exception(f"Failed to rollup pillar {pillar_rollup_id}: {str(e)}")
        raise

