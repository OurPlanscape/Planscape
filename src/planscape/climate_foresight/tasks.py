import logging

from celery import shared_task
from django.db import transaction

from climate_foresight.models import ClimateForesightRunInputDataLayer
from climate_foresight.services import (
    calculate_layer_percentiles,
    normalize_raster_layer,
)
from datasets.models import DataLayerStatus
from datasets.tasks import datalayer_uploaded

log = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def calculate_climate_foresight_layer_statistics(self, input_datalayer_id: int) -> None:
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
            "datalayer", "run"
        ).get(pk=input_datalayer_id)

        log.info(
            f"Starting percentile calculation for input layer {input_dl.id} "
            f"(datalayer {input_dl.datalayer.id})"
        )

        if input_dl.statistics_calculated:
            return

        percentiles = calculate_layer_percentiles(
            input_layer=input_dl.datalayer,
        )

        with transaction.atomic():
            input_dl.outlier_thresholds = percentiles["outlier_thresholds"]
            input_dl.statistics_calculated = True
            input_dl.save()

        log.info(
            f"Successfully calculated percentiles for input layer {input_dl.id}. "
            f"Thresholds: {percentiles['outlier_thresholds']}"
        )

    except ClimateForesightRunInputDataLayer.DoesNotExist:
        log.error(f"Input data layer {input_datalayer_id} does not exist")
        raise

    except Exception as e:
        log.exception(
            f"Failed to calculate statistics for input layer {input_datalayer_id}: {str(e)}"
        )
        raise


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def normalize_climate_foresight_input_layer(self, input_datalayer_id: int) -> None:
    """
    Normalize a climate foresight input data layer asynchronously.

    This task:
    1. Reads the original raster
    2. Applies auto-normalization
    3. Creates a new normalized DataLayer
    4. Links it to the ClimateForesightRunInputDataLayer
    5. Processes the normalized layer (COG, hash, etc.)

    Args:
        input_datalayer_id: ID of the ClimateForesightRunInputDataLayer to normalize
    """
    try:
        input_dl = ClimateForesightRunInputDataLayer.objects.select_related(
            "datalayer", "run"
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
            return

        result = normalize_raster_layer(
            input_layer=input_dl.datalayer,
            run_id=input_dl.run.id,
            created_by=input_dl.run.created_by,
        )

        normalized_layer = result["datalayer"]

        with transaction.atomic():
            input_dl.normalized_datalayer = normalized_layer
            input_dl.save()

        log.info(
            f"Linked normalized layer {normalized_layer.id} to input layer {input_dl.id}"
        )

        datalayer_uploaded.delay(normalized_layer.pk, status=DataLayerStatus.READY)

        log.info(
            f"Successfully normalized input layer {input_dl.id}. "
            f"Transformation: {result['transformation_info']['transformation']}"
        )

    except ClimateForesightRunInputDataLayer.DoesNotExist:
        log.error(f"Input data layer {input_datalayer_id} does not exist")
        raise

    except Exception as e:
        log.exception(f"Failed to normalize input layer {input_datalayer_id}: {str(e)}")
        raise
