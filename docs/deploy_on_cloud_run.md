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
read timeout. The Cloud Run services themselves need matching settings in the
`infrastructure` repository (`terraform/app/variables.tf`):

* `planscape_backend_timeout` and `planscape_gateway_timeout`: Cloud Run
  closes every socket at the request timeout, so raise them from `120s` to
  `3600s`. Clients reconnect after that.
* `planscape_backend_max_instance_request_concurrency`: every open socket
  holds one request slot for its lifetime. With the default of `2` a third
  browser tab starts a new backend instance; under ASGI one instance handles
  many concurrent requests, so a value around `80` is appropriate. Instances
  with open sockets do not scale to zero.
* Optional: `PLANSCAPE_WEBSOCKET_ALLOWED_ORIGINS` (defaults to
  `PLANSCAPE_CORS_ALLOWED_ORIGINS`, which already contains the site origin)
  and `CHANNEL_LAYER_REDIS_URL` (defaults to `REDIS_URL`; a separate Valkey db
  keeps channel keys out of the cache).

Until those are applied the endpoint answers but sockets are cut every two
minutes.

Under ASGI, Django runs each request on its own short-lived thread, so
`PLANSCAPE_DATABASE_CONN_MAX_AGE` no longer reuses connections across
requests. Measure connection churn after the switch; the follow-up is
psycopg 3 with Django's built-in connection pool.

The legacy VM deployment (`bin/run_server.sh`, uWSGI behind nginx with
`uwsgi_pass`) has no WebSocket endpoint: uWSGI cannot serve ASGI. Everything
else keeps working there as plain WSGI.
