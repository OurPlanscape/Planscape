# Deploy Planscape to Cloud Run

This document details the architecutre of Planscape on GCP infrastructure,
and how is the deploy process.


## Architecture on Cloud Run

The list below details which GCP service each component uses.

* Database: Cloud SQL (Postgres 15)
* Cache: Memory Store for Valkey (Versio 8)
* Celery Broker: Memory Store for Valkey (Versio 8)
* Front-end: Built Angular files hosted on GCS Bucket
* NGINX: Cloud Run Functions (Dockerfile.gateway)
* Back-end web service: Cloud Run Functions (Dockerfile)
* Celery workers: Cloud Run Functions (Dockerfile)
* Front-end builder: Cloud Run Jobs (Dockerfile.frontend-job)
* Database migration and command executions: Cloud Run Jobs (Dockerfile)
* Secrets: Secret Manager

Outside GCP:
* Environment variables: Terraform
* CI/CD: Github Actions


## Deployment process

All deploy commands live in the `Makefile`. Docker images are tagged with the
git commit sha and shared by every environment, so staging and production run
exactly the image that was built and tested on dev.

To deploy by hand you need the
[Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk), Docker
with BuildKit, and an account with at least:

* `roles/run.admin`: update Cloud Run services and jobs, execute jobs
* `roles/artifactregistry.writer`: push images
* `roles/iam.serviceAccountUser`: deploy with the services' service accounts

```bash
make deploy ENV=<dev|staging|production>              # current commit
make deploy ENV=production IMAGE_TAG=<commit sha>     # a specific commit
```

`make deploy` runs the steps below. Each one is also a target on its own.

### Build images (`make ensure-images`)

`Dockerfile` (backend, celery and the django command job), `Dockerfile.gateway`
(NGINX) and `Dockerfile.frontend-job` (Angular builder) are built with BuildKit,
using the newest image in each Artifact Registry repository as cache. An image
is only built when the registry does not have one for the commit yet, so
deploying an already-built commit to another environment skips this step.

Static files are collected inside the backend image at build time.

### Backend (`make deploy-backend`)

1. Points the django command job at the new image.
2. Runs `migrate`, unless no migration file changed between the commit
   currently serving the backend and the one being deployed
   (`FORCE_MIGRATE=1` always runs it).
3. Rolls backend, celery workers, celery beat and gateway to the new image, in
   parallel.

### Frontend (`make deploy-frontend`)

Points the frontend build job at the new image and executes it. The job builds
the Angular app with the environment's variables and secrets and publishes it
to the GCS bucket. It runs in parallel with the backend deploy.

### Other useful targets

```bash
make migrate ENV=<environment>                   # run migrations
make manage ENV=<environment> MANAGE_ARGS="..."  # any manage.py command as a job
make build-push-all                              # build + push the three images
```


## CI/CD

GitHub Actions (`.github/workflows/deploy.yml`) runs the same `Makefile`
targets, with one job per image and separate jobs for backend and frontend so
each part starts as soon as its image is ready.

### Dev

Each push to `main` (merged Pull Request).

### Staging

Each time a **Pre-release** is published.

### Production

Each time a **Release** is published, or a pre-release is promoted to release.

Deploys to the same environment never run concurrently; a newer run waits for
the one in progress.


## Changing Feature Flags

The `FEATURE_FLAGS` are configured via Terraform and shared between 
back-end and front-end. Once updated, all back-end services are 
redeployed automatically. But, it is necessary to rebuild the 
Angular App again.

In order to execute it, use the following command OR trigger the 
execution on GCP web console.

```bash
make deploy-frontend ENV=<environment>
```
