#!/bin/bash
set -x
set -o pipefail

NPROC=$(nproc)
CORN_WORKERS=4
OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true

app_name="planscape"
echo $(pwd)
echo "Running migrations & collectstatic"
python3 manage.py migrate --no-input
python3 manage.py collectstatic --no-input
echo "migrated"
echo 
if [[ "$ENV" == "production" ]]; then
  echo "Starting gunicorn for production"
  opentelemetry-instrument \
    --service_name planscape \
    uwsgi --ini planscape/uwsgi.ini

else
  echo "Starting gunicorn locally"
  opentelemetry-instrument \
    --service_name planscape \
    uwsgi --ini planscape/uwsgi.ini
fi