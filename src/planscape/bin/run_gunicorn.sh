#!/bin/bash
set -e
set -o pipefail

PORT="${PORT:-8000}"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-4}"

app_name="planscape"

# HTTP and WebSockets are served by the same ASGI application (planscape.asgi).
if [[ "$ENV" == "production" || "$ENV" == "staging" || "$K_SERVICE" != "" ]]; then
  echo "Starting gunicorn with uvicorn workers"
  exec uv run gunicorn planscape.asgi:application \
    -k uvicorn_worker.UvicornWorker \
    -n "$app_name" \
    --bind "0.0.0.0:${PORT}" \
    --workers "$GUNICORN_WORKERS" \
    --log-level INFO \
    --timeout 120

else
  # gunicorn's --reload cannot restart uvicorn workers, so run uvicorn directly.
  echo "Starting uvicorn locally"
  exec uv run uvicorn planscape.asgi:application \
    --host 0.0.0.0 \
    --port "${PORT}" \
    --reload \
    --log-level info
fi
