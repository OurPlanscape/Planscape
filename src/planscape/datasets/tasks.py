import logging

from core.gcs import get_gcs_hash, is_gcs_file, update_file_cache_control
from core.mattermost import post_to_mattermost
from core.s3 import get_s3_hash, is_s3_file
from django.conf import settings
from django.db import connection
from gis.vectors import ogr2ogr
from planning.geometry import to_multipolygon
from planscape.celery import app

from datasets.models import DataLayer, DataLayerStatus, DataLayerType

logger = logging.getLogger(__name__)


def process_datalayer(
    datalayer_id: int,
    status: DataLayerStatus = DataLayerStatus.READY,
):
    from datasets.services import get_datalayer_outline

    try:
        datalayer = DataLayer.objects.get(pk=datalayer_id)
    except DataLayer.DoesNotExist:
        logger.warning("Datalayer %s does not exist", datalayer_id)
        return

    try:
        if is_s3_file(datalayer.url) and datalayer.url:
            datalayer.hash = get_s3_hash(datalayer.url, bucket=settings.S3_BUCKET)
        elif is_gcs_file(datalayer.url) and datalayer.url:
            datalayer.hash = get_gcs_hash(datalayer.url)
        datalayer.status = status
        if datalayer.type == DataLayerType.VECTOR and datalayer.url:
            datastore_table = ogr2ogr(datalayer.url)
            validate_datastore_table(datastore_table, datalayer)
            datalayer.table = datastore_table
        outline = get_datalayer_outline(datalayer)
        datalayer.outline = to_multipolygon(outline) if outline else None
    except Exception:
        logger.exception(
            "Something went wrong while ingesting and processing datalayer %s",
            datalayer_id,
        )
        datalayer.status = DataLayerStatus.FAILED
    finally:
        datalayer.save()
        datalayer_file_post_process.delay(datalayer_id=datalayer_id)


@app.task()
def datalayer_file_post_process(datalayer_id: int):
    """
    Post processing on datalayer's file after upload is complete.

    :param datalayer: Description
    :type datalayer: DataLayer
    """

    try:
        datalayer = DataLayer.objects.get(pk=datalayer_id)
    except DataLayer.DoesNotExist:
        logger.warning("Datalayer %s does not exist", datalayer_id)
        return

    if datalayer.status != DataLayerStatus.READY:
        logger.warning(
            "Datalayer %s is not in READY status, skipping post processing",
            datalayer_id,
        )
        return

    try:
        if is_gcs_file(datalayer.url):
            update_file_cache_control(
                gs_url=datalayer.url,
                directives=settings.GCS_DEFAULT_CACHE_DIRECTIVES,
            )
    except Exception:
        logger.exception("Failed to set cache control for datalayer %s", datalayer_id)


@app.task()
def datalayer_uploaded(
    datalayer_id: int,
    status: DataLayerStatus = DataLayerStatus.READY,
) -> None:
    process_datalayer(datalayer_id, status)


@app.task()
def calculate_datalayer_outline(datalayer_id: int) -> None:
    from datasets.services import get_datalayer_outline

    try:
        datalayer = DataLayer.objects.get(pk=datalayer_id)
    except DataLayer.DoesNotExist:
        logger.warning("Datalayer %s does not exist", datalayer_id)
        return

    try:
        result = get_datalayer_outline(datalayer)
        datalayer.outline = to_multipolygon(result) if result else None
        datalayer.save(update_fields=["outline", "updated_at"])
    except Exception:
        logger.exception(
            "Failed to calculate outline for datalayer %s",
            datalayer_id,
        )


@app.task()
def refresh_forisk_mill_layers_task() -> None:
    from django.conf import settings

    from datasets.forisk_mills import refresh_forisk_mill_layers

    if not settings.FORISK_MILLS_SUB_KEY or not settings.FORISK_MILLS_USER_KEY:
        logger.warning("Forisk mill credentials are not configured; skipping refresh.")
        return
    if not settings.FORISK_MILLS_API_URL:
        logger.warning("FORISK_MILLS_API_URL is not configured; skipping refresh.")
        return

    try:
        output_files = refresh_forisk_mill_layers(
            organization_id=settings.FORISK_MILLS_PLANSCAPE_ORG_ID,
            dataset_name=settings.FORISK_MILLS_DATASET_NAME,
            sub_key=settings.FORISK_MILLS_SUB_KEY,
            user_key=settings.FORISK_MILLS_USER_KEY,
            api_url=settings.FORISK_MILLS_API_URL,
            timeout=settings.FORISK_MILLS_TIMEOUT,
        )
        refreshed_layers = ", ".join(output_files.keys())
        logger.info("Refreshed Forisk mill layers: %s", refreshed_layers)
        post_to_mattermost(
            f"planscape-{settings.ENV} :white_check_mark: "
            f"Forisk mill layers refreshed successfully: {refreshed_layers}"
        )
    except Exception as exc:
        logger.exception("Forisk mill layer refresh failed.")
        post_to_mattermost(
            f"planscape-{settings.ENV} :x: Forisk mill layer refresh failed: {exc}"
        )
        raise


def validate_datastore_table(datastore_table_name: str, datalayer: DataLayer):
    """
    Check if the datastore table exists in the database,
    and if it has the correct number of features.
    :param datastore_table_name: The name of the datastore table to check.
    :param: Datalayer object to check against.
    :raises ValueError: If the datastore table does not exist or has the wrong number of features.
    """
    schema_name = datastore_table_name.split(".")[0]
    table_name = datastore_table_name.split(".")[1]
    expected_count = datalayer.info[list(datalayer.info.keys())[0]].get("count")  # type: ignore
    with connection.cursor() as cursor:
        cursor.execute(f'SELECT count(*) FROM "{schema_name}"."{table_name}"')
        actual_count = cursor.fetchone()[0]  # type: ignore
    if expected_count != actual_count:
        logger.error(
            "Datastore table %s has %s features, but expected %s.",
            datastore_table_name,
            actual_count,
            expected_count,
        )
        raise ValueError(
            "Datastore table %s has %s features, but expected %s.",
            datastore_table_name,
            actual_count,
            expected_count,
        )
