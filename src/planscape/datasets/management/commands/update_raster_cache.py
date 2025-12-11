import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from core.gcs import update_file_cache_control
from datasets.models import DataLayer, DataLayerStatus, DataLayerType

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Update the cache control headers for raster data layers stored in GCS."

    def handle(self, *args, **options):
        datalayers = DataLayer.objects.filter(
            type=DataLayerType.RASTER,
            url__startswith="gs://",
            status=DataLayerStatus.READY,
        )

        for datalayer in datalayers:
            try:
                update_file_cache_control(
                    gs_url=datalayer.url,
                    directives=settings.GCS_DEFAULT_CACHE_DIRECTIVES,
                )
            except Exception:
                logger.exception(
                    f"Failed to update cache control for DataLayer id={datalayer.id} url={datalayer.url}"
                )