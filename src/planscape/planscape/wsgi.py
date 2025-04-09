import logging
import os
from uuid import uuid4

from django.core.wsgi import get_wsgi_application
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# support for logs is currently experimental
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_INSTANCE_ID, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from uwsgidecorators import postfork

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")


@postfork
def hook_otel():
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    resource = Resource.create(
        attributes={
            # each worker needs a unique service.instance.id to distinguish the created metrics in prometheus
            SERVICE_INSTANCE_ID: str(uuid4()),
            "service.name": str(os.environ.get("OTEL_SERVICE_NAME")),
        }
    )

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
    )
    trace.set_tracer_provider(tracer_provider)

    metrics.set_meter_provider(
        MeterProvider(
            resource=resource,
            metric_readers=[
                (PeriodicExportingMetricReader(OTLPMetricExporter(endpoint=endpoint)))
            ],
        )
    )

    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=endpoint))
    )
    logging.getLogger().addHandler(
        LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)
    )


application = get_wsgi_application()
