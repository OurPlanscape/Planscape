import logging

from core.s3 import get_s3_hash
from django.conf import settings
from gis.vectors import ogr2ogr

from datasets.models import DataLayer, DataLayerStatus, DataLayerType
from planscape.celery import app

logger = logging.getLogger(__name__)


@app.task()
def datalayer_uploaded(
    datalayer_id: int,
    status: DataLayerStatus = DataLayerStatus.READY,
):
    try:
        datalayer = DataLayer.objects.get(pk=datalayer_id)
        datalayer.hash = get_s3_hash(datalayer.url, bucket=settings.S3_BUCKET)
        datalayer.status = status
        if datalayer.type == DataLayerType.VECTOR:
            datalayer.table = ogr2ogr(datalayer.url)
        datalayer.save()
    except DataLayer.DoesNotExist:
        logger.warning("Datalayer %s does not exist", datalayer_id)
    pass
