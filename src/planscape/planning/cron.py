from planning.models import SharedLink
from django.utils import timezone
from django.conf import settings
from planscape.celery import app
import logging

logger = logging.getLogger(__name__)


@app.task()
def delete_old_shared_links(interval=settings.SHARED_LINKS_NUM_DAYS_VALID):
    logger.info("Deleting old links from shared links table...")
    expire_date = timezone.now() - timezone.timedelta(days=interval)
    links_to_delete = SharedLink.objects.filter(created_at__lte=expire_date)
    try:
        counted, _ = links_to_delete.delete()
        logger.info(f"Deleted {counted} links from shared links table.")
    except Exception:
        logger.error("Could not delete links from shared links table.")
