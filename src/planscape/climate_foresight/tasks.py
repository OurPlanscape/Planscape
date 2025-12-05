import logging
from typing import Optional
from django.db import transaction

from datasets.models import DataLayer
from datasets.tasks import datalayer_uploaded

from climate_foresight.models import (
    ClimateForesightRunInputDataLayer,
    InputDataLayerStatus,
    ClimateForesightPillarRollup,
    ClimateForesightPillarRollupStatus,
    ClimateForesightLandscapeRollup,
    ClimateForesightLandscapeRollupStatus,
    ClimateForesightPromote,
    ClimateForesightPromoteStatus,
)
from climate_foresight.services import (
    calculate_layer_statistics,
    normalize_raster_layer,
    rollup_pillar,
)
from climate_foresight.landscape import rollup_landscape
from climate_foresight.promote import run_promote_analysis
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


@app.task(
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def rollup_climate_foresight_landscape(landscape_rollup_id: int) -> dict:
    """
    Rollup landscape-level current and future rasters asynchronously.

    This task:
    1. Gets all completed pillar rollups for the run
    2. Averages pillar rollups → current_landscape raster
    3. Maps pillars to future climate layers (with default fallback)
    4. Averages future layers → future_landscape raster
    5. Updates ClimateForesightLandscapeRollup with results

    NOTE: This task should be chained with datalayer_uploaded for both output layers.

    Args:
        landscape_rollup_id: ID of the ClimateForesightLandscapeRollup to process

    Returns:
        dict: IDs of created current and future DataLayers
    """
    try:
        landscape_rollup_obj = ClimateForesightLandscapeRollup.objects.select_related(
            "run", "run__created_by"
        ).get(pk=landscape_rollup_id)

        log.info(
            f"Starting landscape rollup task for rollup {landscape_rollup_id} "
            f"(run={landscape_rollup_obj.run.id})"
        )

        if (
            landscape_rollup_obj.current_datalayer
            and landscape_rollup_obj.future_datalayer
        ):
            log.warning(
                f"Landscape rollup {landscape_rollup_id} already has rasters. Skipping."
            )
            return {
                "current": landscape_rollup_obj.current_datalayer.id,
                "future": landscape_rollup_obj.future_datalayer.id,
            }

        with transaction.atomic():
            landscape_rollup_obj.status = ClimateForesightLandscapeRollupStatus.RUNNING
            landscape_rollup_obj.save()

        result = rollup_landscape(
            run_id=landscape_rollup_obj.run.id,
            created_by=landscape_rollup_obj.run.created_by,
        )

        current_layer = result["current_datalayer"]
        future_layer = result["future_datalayer"]
        future_mapping = result["future_mapping"]

        with transaction.atomic():
            landscape_rollup_obj.current_datalayer = current_layer
            landscape_rollup_obj.future_datalayer = future_layer
            landscape_rollup_obj.future_mapping = future_mapping
            landscape_rollup_obj.status = (
                ClimateForesightLandscapeRollupStatus.COMPLETED
            )
            landscape_rollup_obj.save()

        log.info(
            f"Successfully completed landscape rollup {landscape_rollup_id}. "
            f"Current: {current_layer.id}, Future: {future_layer.id}"
        )

        return {"current": current_layer.pk, "future": future_layer.pk}

    except ClimateForesightLandscapeRollup.DoesNotExist:
        log.error(f"Landscape rollup {landscape_rollup_id} does not exist")
        raise

    except Exception as e:
        try:
            landscape_rollup_obj = ClimateForesightLandscapeRollup.objects.get(
                pk=landscape_rollup_id
            )
            landscape_rollup_obj.status = ClimateForesightLandscapeRollupStatus.FAILED
            landscape_rollup_obj.save()
        except Exception:
            pass

        log.exception(f"Failed to rollup landscape {landscape_rollup_id}: {str(e)}")
        raise


@app.task(
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def run_climate_foresight_promote(promote_id: int) -> dict:
    """
    Run PROMOTe analysis to generate MPAT outputs asynchronously.

    This task:
    1. Gets the current and future landscape rasters from LandscapeRollup
    2. Runs PROMOTe analysis (Monitor, Protect, Adapt, Transform)
    3. Generates 8 output rasters:
       - Monitor, Protect, Adapt, Transform scores
       - Adapt-Protect score
       - Integrated Condition Score
       - MPAT Matrix (categorical)
       - MPAT Strength (categorical with weak/strong)
    4. Updates ClimateForesightPromote with all output layers

    NOTE: All output layers should be chained with datalayer_uploaded.

    Args:
        promote_id: ID of the ClimateForesightPromote to process

    Returns:
        dict: IDs of all created PROMOTe output DataLayers
    """
    try:
        promote_obj = ClimateForesightPromote.objects.select_related(
            "run", "run__created_by", "run__landscape_rollup", "run__planning_area"
        ).get(pk=promote_id)

        log.info(
            f"Starting PROMOTe analysis task for promote {promote_id} "
            f"(run={promote_obj.run.id})"
        )

        if promote_obj.mpat_matrix_datalayer:
            log.warning(f"PROMOTe analysis {promote_id} already completed. Skipping.")
            return {"mpat_matrix": promote_obj.mpat_matrix_datalayer.id}

        landscape_rollup = promote_obj.run.landscape_rollup
        if not landscape_rollup:
            raise ValueError(
                f"No landscape rollup found for run {promote_obj.run.id}. "
                "Complete landscape rollup before running PROMOTe."
            )

        if (
            landscape_rollup.status != ClimateForesightLandscapeRollupStatus.COMPLETED
            or not landscape_rollup.current_datalayer
            or not landscape_rollup.future_datalayer
        ):
            raise ValueError(
                f"Landscape rollup not completed for run {promote_obj.run.id}. "
                "Complete landscape rollup before running PROMOTe."
            )

        with transaction.atomic():
            promote_obj.status = ClimateForesightPromoteStatus.RUNNING
            promote_obj.save()

        result = run_promote_analysis(
            run_id=promote_obj.run.id,
            current_layer=landscape_rollup.current_datalayer,
            future_layer=landscape_rollup.future_datalayer,
            created_by=promote_obj.run.created_by,
            planning_area_geometry=promote_obj.run.planning_area.geometry,
        )

        with transaction.atomic():
            promote_obj.monitor_datalayer = result["monitor_datalayer"]
            promote_obj.protect_datalayer = result["protect_datalayer"]
            promote_obj.adapt_datalayer = result["adapt_datalayer"]
            promote_obj.transform_datalayer = result["transform_datalayer"]
            promote_obj.adapt_protect_datalayer = result["adapt_protect_datalayer"]
            promote_obj.integrated_condition_score_datalayer = result[
                "integrated_condition_score_datalayer"
            ]
            promote_obj.mpat_matrix_datalayer = result["mpat_matrix_datalayer"]
            promote_obj.mpat_strength_datalayer = result["mpat_strength_datalayer"]
            promote_obj.status = ClimateForesightPromoteStatus.COMPLETED
            promote_obj.save()

        log.info(f"Successfully completed PROMOTe analysis {promote_id}")

        return {
            "monitor": result["monitor_datalayer"].pk,
            "protect": result["protect_datalayer"].pk,
            "adapt": result["adapt_datalayer"].pk,
            "transform": result["transform_datalayer"].pk,
            "adapt_protect": result["adapt_protect_datalayer"].pk,
            "integrated_condition_score": result[
                "integrated_condition_score_datalayer"
            ].pk,
            "mpat_matrix": result["mpat_matrix_datalayer"].pk,
            "mpat_strength": result["mpat_strength_datalayer"].pk,
        }

    except ClimateForesightPromote.DoesNotExist:
        log.error(f"PROMOTe analysis {promote_id} does not exist")
        raise

    except Exception as e:
        try:
            promote_obj = ClimateForesightPromote.objects.get(pk=promote_id)
            promote_obj.status = ClimateForesightPromoteStatus.FAILED
            promote_obj.save()
        except Exception:
            pass

        log.exception(f"Failed to run PROMOTe analysis {promote_id}: {str(e)}")
        raise


@app.task()
def process_landscape_datalayers(result: dict) -> dict:
    """
    Process landscape rollup datalayers by calling datalayer_uploaded for both.

    This task is chained after rollup_climate_foresight_landscape to finalize
    both the current and future landscape datalayers (hash calculation, status update).

    Args:
        result: Dict with {"current": int, "future": int} datalayer IDs

    Returns:
        The same result dict for potential further chaining
    """

    if (
        not isinstance(result, dict)
        or "current" not in result
        or "future" not in result
    ):
        log.error(f"Invalid result format for landscape processing: {result}")
        return result

    current_id = result["current"]
    future_id = result["future"]

    log.info(
        f"Processing landscape datalayers: current={current_id}, future={future_id}"
    )

    datalayer_uploaded(current_id)
    datalayer_uploaded(future_id)

    log.info("Successfully processed both landscape datalayers")

    return result


@app.task()
def process_promote_datalayers(result: dict) -> dict:
    """
    Process PROMOTe output datalayers by calling datalayer_uploaded for all 8.

    This task is chained after run_climate_foresight_promote to finalize
    all PROMOTe output datalayers (hash calculation, status update).

    Args:
        result: Dict with PROMOTe output layer IDs

    Returns:
        The same result dict for potential further chaining
    """
    expected_keys = [
        "monitor",
        "protect",
        "adapt",
        "transform",
        "adapt_protect",
        "integrated_condition_score",
        "mpat_matrix",
        "mpat_strength",
    ]

    if not isinstance(result, dict):
        log.error(f"Invalid result format for PROMOTe processing: {result}")
        return result

    log.info(f"Processing PROMOTe datalayers: {result}")

    for key in expected_keys:
        if key in result:
            layer_id = result[key]
            log.info(f"Processing PROMOTe output '{key}': {layer_id}")
            datalayer_uploaded(layer_id)
        else:
            log.warning(f"Missing expected PROMOTe output key: {key}")

    log.info("Successfully processed all PROMOTe datalayers")

    return result


@app.task()
def auto_progress_climate_foresight_run(run_id: int) -> dict:
    """
    Automatically progress a Climate Foresight run to the next ready steps.

    This task checks what's ready and triggers:
    - Pillar rollups (if all input layers for a pillar are normalized)
    - Landscape rollup (if all pillars completed)
    - PROMOTe analysis (if landscape completed)
    - Mark run as DONE (if PROMOTe completed)

    Args:
        run_id: ID of the ClimateForesightRun to progress

    Returns:
        dict: Summary of what was triggered
    """
    from climate_foresight.orchestration import (
        trigger_pillar_rollups_if_ready,
        trigger_landscape_rollup_if_ready,
        trigger_promote_if_ready,
        check_run_completion,
    )

    log.info(f"Auto-progressing Climate Foresight run {run_id}")

    results = {
        "run_id": run_id,
        "pillar_rollups": trigger_pillar_rollups_if_ready(run_id),
        "landscape_rollup": trigger_landscape_rollup_if_ready(run_id),
        "promote": trigger_promote_if_ready(run_id),
        "completion_check": check_run_completion(run_id),
    }

    log.info(f"Auto-progress results for run {run_id}: {results}")

    return results
