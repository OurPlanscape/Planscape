import os

from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


def get_catalog_backup_schedule() -> dict[str, dict]:
    return {
        "generate-catalog-backup": {
            "task": "core.tasks.generate_backup_data_task",
            "schedule": crontab.from_string(settings.CATALOG_BACKUP_CRON),
        }
    }


def get_catalog_restore_schedule() -> dict[str, dict]:
    if not settings.CATALOG_RESTORE_ENABLED:
        return {}

    return {
        "load-catalog-backup": {
            "task": "core.tasks.load_latest_catalog_backup_task",
            "schedule": crontab.from_string(settings.CATALOG_RESTORE_CRON),
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
}

beat_schedule.update(get_catalog_backup_schedule())
beat_schedule.update(get_catalog_restore_schedule())

app.conf.beat_schedule = beat_schedule
