import os

from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_init
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.celery import CeleryInstrumentor

from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")


@worker_process_init.connect(weak=False)
def init_celery_tracing(*args, **kwargs):
    # Re-initialize the tracer provider and span processor for the new process
    provider = TracerProvider()
    span_processor = BatchSpanProcessor(ConsoleSpanExporter()) 
    provider.add_span_processor(span_processor)
    trace.set_tracer_provider(provider)
    CeleryInstrumentor().instrument()


app = Celery("planscape")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

beat_schedule = {
    "trigger-geopackage-generation": {
        "task": "planning.tasks.trigger_geopackage_generation",
        "schedule": 10.0,  # runs every 10 seconds
    },
    "trigger-scenario-ready-emails": {
        "task": "planning.tasks.trigger_scenario_ready_emails",
        "schedule": 10.0,
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
