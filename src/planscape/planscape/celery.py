import os

from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


def get_catalog_backup_schedule() -> dict[str, dict]:
    if not settings.CATALOG_BACKUP_CRON:
        return {}

    return {
        "generate-catalog-backup": {
            "task": "core.tasks.generate_backup_data_task",
            "schedule": crontab.from_string(settings.CATALOG_BACKUP_CRON),
        }
    }


def get_catalog_restore_schedule() -> dict[str, dict]:
    if not settings.CATALOG_RESTORE_CRON:
        return {}

    return {
        "load-catalog-backup": {
            "task": "core.tasks.load_latest_catalog_backup_task",
            "schedule": crontab.from_string(settings.CATALOG_RESTORE_CRON),
        }
    }


def get_forisk_mills_schedule() -> dict[str, dict]:
    if not settings.FORISK_MILLS_CRON:
        return {}

    return {
        "refresh-forisk-mill-layers": {
            "task": "datasets.tasks.refresh_forisk_mill_layers_task",
            "schedule": crontab.from_string(settings.FORISK_MILLS_CRON),
        }
    }


def get_twig_treatments_schedule() -> dict[str, dict]:
    if not settings.TWIG_TREATMENTS_CRON:
        return {}

    return {
        "refresh-twig-treatment-layers": {
            "task": "datasets.tasks.refresh_twig_treatment_layers_task",
            "schedule": crontab.from_string(settings.TWIG_TREATMENTS_CRON),
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

if settings.WEEKLY_NEW_USERS_REPORT_ENABLED:
    beat_schedule["send-weekly-new-users-report"] = {
        "task": "planning.tasks.send_weekly_new_users_report",
        "schedule": crontab(day_of_week="monday", hour=13, minute=0),
    }

if settings.WEEKLY_FUNDING_REPORT_USERS_REPORT_ENABLED:
    beat_schedule["send-weekly-funding-report-users-report"] = {
        "task": "funding_report.tasks.send_weekly_funding_report_users_report",
        "schedule": crontab(day_of_week="monday", hour=13, minute=0),
    }

beat_schedule.update(get_catalog_backup_schedule())
beat_schedule.update(get_catalog_restore_schedule())
beat_schedule.update(get_forisk_mills_schedule())
beat_schedule.update(get_twig_treatments_schedule())

app.conf.beat_schedule = beat_schedule
