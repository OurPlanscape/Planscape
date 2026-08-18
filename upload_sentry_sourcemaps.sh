#!/bin/bash

# Uploads sourcemaps to Sentry using debug IDs (no release config needed in the app).
# Requires .sentryclirc at the repo root with [defaults] org and project set, and
# SENTRY_AUTH_TOKEN either exported or set in the root .env.

warn() {
    echo ""
    echo "########################################################################"
    echo "# WARNING: $1"
    echo "# Stack traces in Sentry will stay MINIFIED for this build."
    echo "########################################################################"
    echo ""
}

if [ ! -f ".sentryclirc" ]; then
    warn ".sentryclirc not found -- skipping Sentry sourcemap upload."
    exit 0
fi

# Read only this key rather than sourcing .env, which would execute the whole file.
if [ -z "${SENTRY_AUTH_TOKEN}" ] && [ -f ".env" ]; then
    SENTRY_AUTH_TOKEN="$(
        grep -E '^[[:space:]]*SENTRY_AUTH_TOKEN[[:space:]]*=' .env |
            tail -n 1 |
            cut -d '=' -f 2- |
            sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
                -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
    )"
    export SENTRY_AUTH_TOKEN
fi

if [ -z "${SENTRY_AUTH_TOKEN}" ]; then
    warn "SENTRY_AUTH_TOKEN not set (checked the environment and .env) -- skipping Sentry sourcemap upload."
    exit 0
fi

echo "Verifying Sentry credentials..."
if ! sentry-cli info; then
    warn "Could not authenticate against Sentry. Check .sentryclirc and SENTRY_AUTH_TOKEN."
    exit 1
fi

echo "Injecting debug IDs and uploading sourcemaps to Sentry..."
if ! sentry-cli sourcemaps inject ./src/interface/dist/out; then
    warn "Debug ID injection failed."
    exit 1
fi

if ! sentry-cli sourcemaps upload ./src/interface/dist/out; then
    warn "Sourcemap upload failed."
    exit 1
fi

echo "Sentry sourcemaps uploaded successfully."
