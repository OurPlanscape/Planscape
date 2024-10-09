#!/bin/bash
set -x
set -o pipefail

NPROC=$(nproc)
CORN_WORKERS=4

app_name="planscape"

echo "Running migrations & collectstatic"
python3 manage.py migrate --no-input
python3 manage.py collectstatic --no-input
echo "migrated"

echo "Starting gunicorn for production"
if [[ "$ENV" == "production" ]]; then
  echo "Starting gunicorn for production"
  gunicorn planscape.wsgi:application \
    -n "$app_name" \
    --bind 0.0.0.0:8000 \
    --workers "$CORN_WORKERS" \
    --log-level INFO \
    --timeout 120

else
  echo "Starting gunicorn locally"
  gunicorn planscape.wsgi:application \
    -n "$app_name" \
    --bind 0.0.0.0:8000 \
    --workers "$CORN_WORKERS" \
    --log-level INFO \
    --timeout 120 \
    --reload
fi