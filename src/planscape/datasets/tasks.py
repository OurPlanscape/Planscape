import logging

from core.s3 import get_s3_hash
from datasets.models import DataLayer, DataLayerStatus, DataLayerType
from django.conf import settings
from gis.vectors import ogr2ogr
from utils.frontend import get_base_url
from datasets.services import get_storage_url

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
        storage_url = get_storage_url(
            organization_id=datalayer.organization_id,
            uuid=datalayer.uuid,
            original_name=datalayer.original_name,
            mimetype=datalayer.mimetype,
        )
        datalayer.hash = get_s3_hash(storage_url, bucket=settings.S3_BUCKET)
        datalayer.status = status
        if datalayer.type == DataLayerType.VECTOR:
            datalayer.table = ogr2ogr(storage_url, datalayer.uuid)
            datalayer.url = (
                f"{get_base_url(settings.ENV)}/tiles/dynamic?layer={datalayer.id}"
            )
    except Exception:
        logger.exception(
            "Something went wrong while ingesting and processing datalayer %s",
            datalayer_id,
        )
        datalayer.status = DataLayerStatus.FAILED
    finally:
        datalayer.save()
