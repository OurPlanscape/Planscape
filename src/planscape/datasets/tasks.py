import logging

from django.db import connection

from core.s3 import get_s3_hash
from datasets.models import DataLayer, DataLayerStatus, DataLayerType
from django.conf import settings
from gis.vectors import ogr2ogr

from planscape.celery import app

logger = logging.getLogger(__name__)


@app.task()
def datalayer_uploaded(
    datalayer_id: int,
    status: DataLayerStatus = DataLayerStatus.READY,
):
    try:
        datalayer = DataLayer.objects.get(pk=datalayer_id)
    except DataLayer.DoesNotExist:
        logger.warning("Datalayer %s does not exist", datalayer_id)
        return

    try:
        datalayer.hash = get_s3_hash(datalayer.url, bucket=settings.S3_BUCKET)
        datalayer.status = status
        if datalayer.type == DataLayerType.VECTOR:
            datastore_table = ogr2ogr(datalayer.url)
            validate_datastore_table(datastore_table, datalayer)
            datalayer.table = datastore_table
    except Exception:
        logger.exception(
            "Something went wrong while ingesting and processing datalayer %s",
            datalayer_id,
        )
        datalayer.status = DataLayerStatus.FAILED
    finally:
        datalayer.save()


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
