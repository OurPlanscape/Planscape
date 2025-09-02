import os

from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

beat_schedule = {
    "trigger-geopackage-generation": {
        "task": "planning.cron.trigger_geopackage_generation",
        "schedule": crontab(minute="*"),  # runs every minute
    },
}

if settings.E2E_TESTS_ENABLED:
    beat_schedule.update(
        {
            "run-e2e-test": {
                "task": "e2e.tasks.run_e2e_test",
                "schedule": crontab(hour=0, minute=0),  # runs daily at midnight
            },
        }
    )


app.conf.beat_schedule = beat_schedule
