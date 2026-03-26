#!/bin/bash

# Initialize our own variables
OPTIND=1         # Reset in case getopts has been used previously in the shell.
env="local"
dry_run=0

while getopts "h?de:" opt; do
    case "$opt" in
    h|\?)
        echo "This script syncronizes targeted env datalayers bucket with Catalog's datalayers bucket"
        echo "Usage: $0 [-d] [-e env]"
        echo "-d: dry-run"
        echo "-e: environment (dev, staging, production)"
        exit 0
        ;;
    d)  dry_run=1
        ;;
    e)  env=$OPTARG
        ;;
    esac
done

if [ $env != "dev" ] && [ $env != "staging" ] && [ $env != "production" ]; then
    echo "Invalid environment name."
    echo "Expected values: dev, staging, production."
    exit 1
fi

if [ $dry_run -eq 1 ]; then
    echo "DRY-RUN: Syncing everything from gs://planscape-datastore-catalog/datalayers to gs://planscape-datastore-$env/datalayers"

    gcloud storage rsync gs://planscape-datastore-catalog/datalayers gs://planscape-datastore-$env/datalayers --recursive --dry-run
else
    echo "Syncing everything from gs://planscape-datastore-catalog/datalayers to gs://planscape-datastore-$env/datalayers"

    gcloud storage rsync gs://planscape-datastore-catalog/datalayers gs://planscape-datastore-$env/datalayers --recursive

    echo "RSYNC Finished!. Now you should execute Django command 'load_catalog_data' on $env."
fi

