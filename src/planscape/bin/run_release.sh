#!/bin/bash
set -e
set -o pipefail

echo "Running migrations"
uv run python manage.py migrate --no-input

echo "Collecting static files"
uv run python manage.py collectstatic --no-input

echo "Release tasks completed"
