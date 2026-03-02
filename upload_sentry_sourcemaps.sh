#!/bin/bash

# Uploads sourcemaps to Sentry using debug IDs (no release config needed in the app).
# Requires .sentryclirc at the repo root with [defaults] org and project set,
# and SENTRY_AUTH_TOKEN in the environment.

if [ ! -f ".sentryclirc" ]; then
    echo "Notice: .sentryclirc file not found. Skipping Sentry sourcemap uploads."
    exit 0
fi

if [ -z "${SENTRY_AUTH_TOKEN}" ]; then
    echo "Notice: SENTRY_AUTH_TOKEN not set. Skipping Sentry sourcemap uploads."
    exit 0
fi

echo "Injecting debug IDs and uploading sourcemaps to Sentry..."
sentry-cli sourcemaps inject ./src/interface/dist/out && \
sentry-cli sourcemaps upload ./src/interface/dist/out
