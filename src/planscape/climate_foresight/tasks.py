import logging

from django.db import transaction

from climate_foresight.models import ClimateForesightRunInputDataLayer
from climate_foresight.services import (
    calculate_layer_percentiles,
    normalize_raster_layer,
)
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task(
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def calculate_climate_foresight_layer_statistics(input_datalayer_id: int) -> None:
    """
    Calculate percentile thresholds for a climate foresight input data layer.

    This is a lightweight operation that only calculates percentiles (p5, p10, p90, p95)
    for frontend visualization. Transformation parameters are calculated later during
    actual normalization.

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

        result = calculate_layer_percentiles(
            input_layer=input_dl.datalayer,
            planning_area_geometry=planning_area_geometry,
        )

        with transaction.atomic():
            input_dl.statistics = result["statistics"]
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
def normalize_climate_foresight_input_layer(input_datalayer_id: int) -> int:
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

        if input_dl.normalized_datalayer:
            log.warning(
                f"Input layer {input_dl.id} already has a normalized layer "
                f"({input_dl.normalized_datalayer.id}). Skipping."
            )
            return input_dl.normalized_datalayer.id

        planning_area_geometry = input_dl.run.planning_area.geometry

        result = normalize_raster_layer(
            input_layer=input_dl.datalayer,
            run_id=input_dl.run.id,
            created_by=input_dl.run.created_by,
            planning_area_geometry=planning_area_geometry,
        )

        normalized_layer = result["datalayer"]

        with transaction.atomic():
            input_dl.normalized_datalayer = normalized_layer
            input_dl.save()

        log.info(
            f"Linked normalized layer {normalized_layer.id} to input layer {input_dl.id}"
        )

        log.info(
            f"Successfully normalized input layer {input_dl.id}. "
            f"Transformation: {result['transformation_info']['transformation']}"
        )

        return normalized_layer.pk

    except ClimateForesightRunInputDataLayer.DoesNotExist:
        log.error(f"Input data layer {input_datalayer_id} does not exist")
        raise

    except Exception as e:
        log.exception(f"Failed to normalize input layer {input_datalayer_id}: {str(e)}")
        raise
