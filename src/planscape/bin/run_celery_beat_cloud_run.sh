#!/bin/bash
set -e
set -o pipefail

PORT="${PORT:-8000}"

python -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &

exec uv run celery -A planscape beat \
  --loglevel INFO \
  --pidfile= \
  --schedule=/tmp/celerybeat-schedule
