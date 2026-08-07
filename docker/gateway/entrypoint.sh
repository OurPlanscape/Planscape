#!/bin/sh
set -eu

export PORT="${PORT:-8080}"

: "${PLANSCAPE_FRONTEND_URL:?PLANSCAPE_FRONTEND_URL is required}"
: "${PLANSCAPE_BACKEND_URL:?PLANSCAPE_BACKEND_URL is required}"
: "${PLANSCAPE_MARTIN_URL:?PLANSCAPE_MARTIN_URL is required}"

envsubst '${PORT} ${PLANSCAPE_FRONTEND_URL} ${PLANSCAPE_BACKEND_URL} ${PLANSCAPE_MARTIN_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
