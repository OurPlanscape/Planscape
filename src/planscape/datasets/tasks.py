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
            check_datastore_table(datastore_table)
            datalayer.table = datastore_table
    except Exception:
        logger.exception(
            "Something went wrong while ingesting and processing datalayer %s",
            datalayer_id,
        )
        datalayer.status = DataLayerStatus.FAILED
    finally:
        datalayer.save()


def check_datastore_table(datastore_table_name: str) -> bool:
    """
    Check if the datastore table exists in the database.
    :param datastore_table_name: The name of the datastore table to check.
    :return: True if the table exists, False otherwise.
    """
    table_schema = datastore_table_name.split(".")[0]
    table_name = datastore_table_name.split(".")[1]
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
            [table_schema, table_name],
        )
        exists = cursor.fetchone()[0]
    if not exists:
        logger.exception(
            "Datastore table %s does not exist in the database.", datastore_table_name
        )
        raise ValueError(
            f"Datastore table {datastore_table_name} does not exist in the database."
        )
    return exists
