# Deploy Planscape to Cloud Run

This document details the architecutre of Planscape on GCP infrastructure,
and how is the deploy process.


## Architecture on Cloud Run

The list below details which GCP service each component uses.

* Database: Cloud SQL (Postgres 15)
* Cache: Memory Store for Valkey (Versio 8)
* Celery Broker: Memory Store for Valkey (Versio 8)
* Front-end: Built Angular files hosted on GCS Bucket
* NGINX: Cloud Run service (Dockerfile.gateway)
* Back-end web service: Cloud Run service (Dockerfile)
* Celery workers: Cloud Run services (Dockerfile)
* Front-end builder: Cloud Run Jobs (Dockerfile.frontend-job)
* Database migration and command executions: Cloud Run Jobs (Dockerfile)
* Secrets: Secret Manager

Outside GCP:
* Environment variables: Terraform
* CI/CD: Github Actions


## Deployment process

The deploy to GCP commands are configured on `Makefile`.
To deploy all components of this repository, it is necessary having 
[Google Cloud CLI tool](https://docs.cloud.google.com/sdk/docs/install-sdk) installed 
and logged in with a service account with following permissions at minimum:

* `roles/run.invoker`: Cloud Run Invoker
* `roles/secretmanager.secretAccessor`: Secret Manger Access
* `roles/artifactregistry.writer`: Artifact Registry upload
* `roles/artifactregistry.reader`: Artifact Registry read

With that being set, the following performs the deploy on given 
enviroment (dev/staging/production):

```bash
make cloud-run-deploy-all ENV=<environment>
```

The `cloud-run-deploy-all` is divided in four steps detailing bellow:

### Build Docker Images

The images `Dockerfile`, `Dockerfile.gateway` and `Dockerfile.frontend-job` 
are built using the command `gcloud builds submit` by sending the dockerfile 
recepie and the latest image as cache. Which means that the docker image is 
built on GCP infrastructure and any image stored on Artifact Registry can be 
used as cache in order to speed-up the build process.

The `Dockerfile` contains the Python/Django backend application, this image is 
used by backend web service, celery workers and configured to be executed with 
Cloud Run Jobs for database migration and Django Commands.

The `Dockerfile.gateway` contains the NGINX configuration that supports local 
hosting with docker-compose and GCP Cloud Run configuration.

The `Dockerfile.frontend-job` contains the process that builds the Angular app.
It is run on a Cloud Run Job as it ingest multiple environment variables and 
secrets. All environment variables are configured via Terraform and secrets kept 
on Secret Manger in order to have a single point of configuration, as front-end 
and back-end share some variables. (e.g. Feature Flags)

### Update Cloud Run Jobs

After images submission, the next is updating the Cloud Run Jobs that runs 
the front-end builder and back-end commands.

### Database migration

With images up-to-date on Cloud Run Jobs, the database migration command 
is executed.

### Provisioning Cloud Run Services and Building Angular App

After migration, all Cloud Run Services of given environment are updated with 
submitted image and the Fron-End builder job is executed.


## CI/CD

The CI/CD process is executed via Github Actions. It executes  
`make cloud-run-deploy-all ENV=<environment>` with given conditions:

### Dev

Each time a Pull Request is merged to main branch.

### Staging

Each time a **Pre-release** is created.

### Production

Each time a **Release** is created.


## Changing Feature Flags

The `FEATURE_FLAGS` are configured via Terraform and shared between 
back-end and front-end. Once updated, all back-end services are 
redeployed automatically. But, it is necessary to rebuild the 
Angular App again.

In order to execute it, use the following command OR trigger the 
execution on GCP web console.

```bash
make cloud-run-execute-frontend-job ENV=<environment>
```

## WebSockets

The backend serves WebSockets from the same Cloud Run service as HTTP
(`bin/run_gunicorn.sh` runs gunicorn with uvicorn workers). The gateway
proxies `/planscape-backend/ws/` with the `Upgrade` headers and a one hour
read timeout. The Cloud Run services carry matching settings in the
`infrastructure` repository (`terraform/app/`):

* `planscape_backend_timeout` and `planscape_gateway_timeout` are `3600s`.
  Cloud Run closes every socket at the request timeout; clients reconnect.
* `planscape_backend_max_instance_request_concurrency` is `80`: every open
  socket holds one request slot for its lifetime.
* `CHANNEL_LAYER_REDIS_URL` points at a separate Valkey db so channel keys
  stay out of the cache. `PLANSCAPE_WEBSOCKET_ALLOWED_ORIGINS` is optional and
  defaults to `PLANSCAPE_CORS_ALLOWED_ORIGINS`.

### Database connections under ASGI

Django keeps database connections per thread, and under ASGI every request
runs on a new thread. With `PLANSCAPE_DATABASE_CONN_MAX_AGE > 0` and no pool,
connections are never reused and pile up until Postgres runs out of slots
(locally, 2 workers held 82 open connections after 160 requests). Keep
`PLANSCAPE_DATABASE_CONN_MAX_AGE=0` (the default) and enable
`PLANSCAPE_DATABASE_POOL_ENABLED`: each worker process then holds at most
`PLANSCAPE_DATABASE_POOL_MAX_SIZE` connections.

The legacy VM deployment (`bin/run_server.sh`, uWSGI behind nginx with
`uwsgi_pass`) has no WebSocket endpoint: uWSGI cannot serve ASGI. Everything
else keeps working there as plain WSGI.
