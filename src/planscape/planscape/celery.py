import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

app = Celery("proj")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "run-periodic-task": {
        "task": "e2e.tasks.run_e2e_test",
        "schedule": crontab(hour=0, minute=0),  # runs daily at midnight
    },
}
