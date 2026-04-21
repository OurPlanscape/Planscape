import os

from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


def get_catalog_restore_schedule() -> dict[str, dict]:
    if not settings.CATALOG_RESTORE_ENABLED:
        return {}

    return {
        "load-catalog-backup": {
            "task": "core.tasks.load_latest_catalog_backup_task",
            "schedule": crontab(
                minute=settings.CATALOG_RESTORE_CRON_MINUTE,
                hour=settings.CATALOG_RESTORE_CRON_HOUR,
                day_of_week=settings.CATALOG_RESTORE_CRON_DAY_OF_WEEK,
                day_of_month=settings.CATALOG_RESTORE_CRON_DAY_OF_MONTH,
                month_of_year=settings.CATALOG_RESTORE_CRON_MONTH_OF_YEAR,
            ),
        }
    }

beat_schedule = {
    "trigger-scenario-post-processing": {
        "task": "planning.tasks.trigger_scenario_post_processing",
        "schedule": 10.0,  # runs every 10 seconds
    },
    "trigger-geopackage-generation": {
        "task": "planning.tasks.trigger_geopackage_generation",
        "schedule": 10.0,  # runs every 10 seconds
    },
    "trigger-scenario-ready-emails": {
        "task": "planning.tasks.trigger_scenario_ready_emails",
        "schedule": 10.0,
    },
    "generate-catalog-backup": {
        "task": "core.tasks.generate_backup_data_task",
        "schedule": crontab(
            minute=settings.CATALOG_BACKUP_CRON_MINUTE,
            hour=settings.CATALOG_BACKUP_CRON_HOUR,
        ),
    },
}

beat_schedule.update(get_catalog_restore_schedule())

app.conf.beat_schedule = beat_schedule
