#!/bin/bash

# This script uploads sourcemaps to Sentry and injects a sourceId reference. 
# if we have a tagged release, we associate it with the sourcemaps,
# otherwise we use the SHA as the 'release' for dev builds.

# Note that this relies on .sentryclirc for Sentry configs
# and this make command is ignored without that file.

if ! command -v git &> /dev/null
then
    echo "Git is not installed or not in the PATH."
    exit 1
fi

GIT_COMMIT_SHA=$(git rev-parse HEAD)
TAG=main

if [ ! -f ".sentryclirc" ]; then
    echo "Notice: .sentryclirc file not found. Skipping Sentry sourcemap uploads."
    exit 0
elif [ -n "${TAG}" ] && [ "${TAG}" != "main" ]; then
    echo "${TAG} is a tagged release. Informing Sentry of release"
    sentry-cli releases new "${TAG}" && \
    sentry-cli sourcemaps inject ./src/interface/dist --release "${TAG}" && \
    sentry-cli sourcemaps upload --release "${TAG}" ./src/interface/dist
else
    echo
    sentry-cli releases new "${GIT_COMMIT_SHA}" && \
    sentry-cli sourcemaps inject ./src/interface/dist --release "${GIT_COMMIT_SHA}" && \
    sentry-cli sourcemaps upload --release "${GIT_COMMIT_SHA}" ./src/interface/dist
fi

