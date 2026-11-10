import os

import sentry_sdk
from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_shutdown, worker_shutdown
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@worker_process_shutdown.connect
@worker_shutdown.connect
def flush_sentry_events(**kwargs) -> None:
    """
    Send queued Sentry events before a worker process exits.

    Prefork children are recycled (CELERY_WORKER_MAX_TASKS_PER_CHILD) and end
    with os._exit(), which skips Sentry's atexit flush. Cloud Run also stops
    instances with SIGTERM. Without this, events still in the in-memory
    transport queue are lost.
    """
    sentry_sdk.flush(timeout=settings.SENTRY_TIMEOUT)


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
    "check-burn-emulator-jobs": {
        "task": "funding_report.tasks.poll_burn_emulator_jobs",
        "schedule": 60.0,
    },
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
