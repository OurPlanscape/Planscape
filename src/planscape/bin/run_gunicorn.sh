#!/bin/bash
set -e
set -o pipefail

PORT="${PORT:-8000}"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-4}"

app_name="planscape"

if [[ "$ENV" == "production" || "$ENV" == "staging" || "$K_SERVICE" != "" ]]; then
  echo "Starting gunicorn"
  uv run gunicorn planscape.wsgi:application \
    -n "$app_name" \
    --bind "0.0.0.0:${PORT}" \
    --workers "$GUNICORN_WORKERS" \
    --log-level INFO \
    --timeout 120

else
  echo "Starting gunicorn locally"
  uv run gunicorn planscape.wsgi:application \
    -n "$app_name" \
    --bind "0.0.0.0:${PORT}" \
    --workers "$GUNICORN_WORKERS" \
    --log-level INFO \
    --timeout 120 \
    --reload
fi
