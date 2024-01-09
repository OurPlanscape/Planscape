import logging
from planning.models import SharedLink
from django.db import DatabaseError
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


def delete_old_shared_links(interval=settings.SHARED_LINKS_NUM_DAYS_VALID):
    expire_date = timezone.now() - timezone.timedelta(days=interval)
    links_to_delete = SharedLink.objects.filter(created_at__lte=expire_date)
    try:
        counted, _ = links_to_delete.delete()
        logger.info("Deleted %s links from shared links table.", counted)
    except DatabaseError as de:
        logger.error("Error deleting the links %s", de)
    except Exception:
        logger.error("Could not delete links from shared links table.")
