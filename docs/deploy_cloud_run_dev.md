# Deploy Backend To Cloud Run Dev [WIP]

This deploys the Django backend as a Cloud Run service using `docker/Dockerfile`.
It targets the dev environment, uses Cloud SQL through the Cloud Run Cloud SQL
attachment, and uses GCS for storage.

## Required APIs

Enable these APIs in the target project:

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com
```

## Artifact Registry

Create the Docker repository if it does not already exist:

```bash
gcloud artifacts repositories create planscape \
  --repository-format=docker \
  --location=us-central1 \
  --description="Planscape containers"
```

## Service Account

Create a Cloud Run runtime service account for dev:

```bash
gcloud iam service-accounts create planscape-cloud-run-dev \
  --display-name="Planscape Cloud Run dev"
```

Grant it Cloud SQL access:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:planscape-cloud-run-dev@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

Grant GCS access appropriate to the dev buckets:

```bash
gcloud storage buckets add-iam-policy-binding gs://PLANSCAPE_DATASTORE_BUCKET \
  --member="serviceAccount:planscape-cloud-run-dev@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud storage buckets add-iam-policy-binding gs://PLANSCAPE_MEDIA_BUCKET \
  --member="serviceAccount:planscape-cloud-run-dev@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

Grant Secret Manager access to only the secrets the service needs:

```bash
gcloud secrets add-iam-policy-binding planscape-dev-secret-key \
  --member="serviceAccount:planscape-cloud-run-dev@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding planscape-dev-database-password \
  --member="serviceAccount:planscape-cloud-run-dev@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Secrets

Create required secrets:

```bash
printf '%s' 'REPLACE_WITH_DJANGO_SECRET_KEY' | \
  gcloud secrets create planscape-dev-secret-key --data-file=-

printf '%s' 'REPLACE_WITH_DB_PASSWORD' | \
  gcloud secrets create planscape-dev-database-password --data-file=-
```

Optional integrations can be added later as Cloud Run secrets/env vars:

```bash
SENTRY_DSN
OPENPANEL_CLIENT_SECRET
MATTERMOST_WEBHOOK_URL
```

## Cloud SQL

The Cloud Run service uses Cloud SQL attachment/unix socket mode. The deploy
must include the Cloud SQL instance connection name:

```bash
PROJECT_ID:REGION:INSTANCE_NAME
```

The Django setting `PLANSCAPE_DATABASE_INSTANCE_CONNECTION_NAME` converts this
to the unix socket host path:

```bash
/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

The Cloud SQL database must have PostGIS enabled.

## Build And Deploy

Submit the dev Cloud Build config with substitutions for your project:

```bash
gcloud builds submit \
  --config cloudbuild.dev.yaml \
  --substitutions \
_REGION=us-central1,\
_ARTIFACT_REPOSITORY=planscape,\
_SERVICE_NAME=planscape-backend-dev,\
_RELEASE_JOB_NAME=planscape-backend-dev-release,\
_SERVICE_ACCOUNT=planscape-cloud-run-dev@PROJECT_ID.iam.gserviceaccount.com,\
_CLOUD_SQL_INSTANCE=PROJECT_ID:REGION:INSTANCE_NAME,\
_DATABASE_NAME=planscape,\
_DATABASE_USER=planscape,\
_GCS_BUCKET=PLANSCAPE_DATASTORE_BUCKET,\
_GCS_MEDIA_BUCKET=PLANSCAPE_MEDIA_BUCKET,\
_ALLOWED_HOSTS=planscape-backend-dev-HASH-REGION.a.run.app,\
_CORS_ALLOWED_ORIGINS=https://FRONTEND_DEV_ORIGIN,\
_PLANSCAPE_BASE_URL=https://FRONTEND_DEV_ORIGIN,\
_REDIS_URL=redis://REDIS_HOST:6379/1,\
_CELERY_BROKER_URL=redis://REDIS_HOST:6379/0 \
  .
```

The Cloud Build config builds and pushes the image, deploys a release job, and
deploys the Cloud Run service. It does not execute the release job automatically.

## Run Release Tasks

Run migrations and collect static files after the image is built and before
using the new revision:

```bash
gcloud run jobs execute planscape-backend-dev-release \
  --region=us-central1 \
  --wait
```

The release job runs:

```bash
bin/run_release.sh
```

## Verify

Fetch the Cloud Run service URL:

```bash
gcloud run services describe planscape-backend-dev \
  --region=us-central1 \
  --format='value(status.url)'
```

Check the health endpoint:

```bash
curl "https://SERVICE_URL/planscape-backend/health"
```

Expected result: HTTP `200`.

Check logs if the service does not become healthy:

```bash
gcloud run services logs read planscape-backend-dev \
  --region=us-central1 \
  --limit=100
```

## Notes

- Cloud Run sets `PORT`; `bin/run_gunicorn.sh` defaults to `8000` for local use.
- Web startup does not run migrations. Use the release job for migrations.
- Celery workers are not deployed by this first backend service. Features that
  enqueue background jobs need a Redis broker and separate worker deployment.
- If `_ALLOWED_HOSTS` or `_CORS_ALLOWED_ORIGINS` need multiple comma-separated
  values, deploy those env vars with `gcloud run services update` using an env
  vars file to avoid comma escaping issues in Cloud Build substitutions.
