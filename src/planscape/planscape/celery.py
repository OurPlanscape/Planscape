import os
from datetime import timedelta

from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

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

if settings.ENV == "dev":
    beat_schedule["load-catalog-backup"] = {
        "task": "core.tasks.load_backup_data_task",
        "schedule": crontab(
            minute=settings.CATALOG_DEV_LOAD_CRON_MINUTE,
            hour=settings.CATALOG_DEV_LOAD_CRON_HOUR,
            day_of_week=(
                settings.CATALOG_DEV_LOAD_WEEKLY_DAY
                if settings.CATALOG_DEV_LOAD_WEEKLY
                else "*"
            ),
        ),
    }
elif settings.ENV == "staging" and settings.CATALOG_STAGING_LOAD_ENABLED:
    beat_schedule["load-catalog-backup"] = {
        "task": "core.tasks.load_backup_data_task",
        "schedule": timedelta(days=settings.CATALOG_STAGING_LOAD_INTERVAL_DAYS),
    }

app.conf.beat_schedule = beat_schedule
