#!/bin/bash
set -e
set -o pipefail

PORT="${PORT:-8000}"
CELERY_CONCURRENCY="${CELERY_CONCURRENCY:-3}"

if [[ -z "$CELERY_QUEUES" ]]; then
  echo "CELERY_QUEUES is required"
  exit 1
fi

python -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &

exec uv run celery -A planscape worker -E \
  --loglevel INFO \
  --concurrency "$CELERY_CONCURRENCY" \
  -Q "$CELERY_QUEUES"
