UID ?= $(shell id -u)
GID ?= $(shell id -g)
export UID GID

# Name used for git tags / GitHub releases (see taggit).
VERSION="$$(date '+%Y.%m.%d')-$$(git log --abbrev=10 --format=%h | head -1)"
E2E_IMPACTS=impacts_e2e_config.json

help:
	@echo 'Deploy (Cloud Run):'
	@echo '  make deploy ENV=<dev|staging|production>    Build missing images, then deploy backend + frontend'
	@echo '  make deploy-backend ENV=<env>               Migrate (if needed) and roll backend, celery and gateway'
	@echo '  make deploy-frontend ENV=<env>              Rebuild the Angular app for <env> and publish it'
	@echo '  make build-push-all                         Build and push all images for the current commit'
	@echo '  make migrate ENV=<env>                      Run database migrations'
	@echo '  make manage ENV=<env> MANAGE_ARGS="..."     Run any manage.py command as a Cloud Run job'
	@echo ''
	@echo 'Local development:'
	@echo '  make docker-run / docker-test / docker-shell / docker-migrate / docker-makemigrations'
	@echo '  make dev                                    Run frontend + backend locally'

taggit:
	set -e; \
	git checkout main; \
	git pull origin main; \
	git tag -a $(VERSION) -m $(VERSION); \
	git push origin --tags; \
	echo "Completed taggit"

install-dependencies-frontend:
	cd src/interface && npm install

compile-angular:
	cd src/interface && npm run build -- --configuration production --output-path=./dist/out

build-storybook:
	cd src/interface && npm run build-storybook

remove-local-sourcemaps:
	@echo "Removing Sourcemaps from build" ; \
	rm -rf ./src/interface/dist/out/**.map ; \
	rm -rf ./src/interface/dist/interface/**.map

# Injects debug ids into the build and uploads the sourcemaps to Sentry.
# Org and project come from .sentryclirc; the token comes from SENTRY_AUTH_TOKEN,
# either exported or set in the root .env.
upload-sentry-sourcemaps:
	@$(SHELL) ./upload_sentry_sourcemaps.sh || \
	echo "NOTICE: Failed to upload sentry sourcemaps. Continuing to next build step."

handle-sentry-uploads: upload-sentry-sourcemaps remove-local-sourcemaps

e2e-test:
	cd src/interface && npx playwright test

mypy:
	mypy . --strict --ignore-missing-imports | grep src/ | wc -l

test-scenarios:
	cd src/planscape && python3 manage.py test_scenarios

test-impacts:
	cd src/planscape && python3 manage.py e2e_impacts --config_file=$(E2E_IMPACTS)

SERID=$(shell id -u)
GROUPID=$(shell id -g)

TEST=.
APP_LABEL=
DOCKER_BUILDKIT=1

docker-clean:
	docker compose down --volumes
	docker container prune -f

docker-hard-clean: docker-clean
	docker image prune -f

docker-build:
	if [ "$(shell uname -m)" = "arm64" ]; then \
		echo "Building with arm64" ; \
		DOCKERFILE=Dockerfile.arm64 docker compose build ; \
	else \
		echo "Building on x86" ; \
		docker compose build ; \
	fi
docker-test:
	./src/planscape/bin/run.sh uv run pytest $(TEST)

docker-run: docker-build
	docker compose up

docker-run-deps:
	docker compose -f docker/docker-compose.deps.yml up -d

docker-stop-deps:
	docker compose -f docker/docker-compose.deps.yml down

docker-clean-deps:
	docker compose -f docker/docker-compose.deps.yml down --volumes
	docker container prune -f

docker-logs-deps:
	docker compose -f docker/docker-compose.deps.yml logs -f

docker-shell:
	./src/planscape/bin/run.sh bash

docker-makemigrations:
	./src/planscape/bin/run.sh uv run python manage.py makemigrations --no-header $(APP_LABEL) $(OPTIONS)
	find . -type d -name migrations -exec sudo chown -R $(USER): {} +

docker-migrate:
	./src/planscape/bin/run.sh uv run python manage.py migrate


# ---------------------------------------------------------------------------
# Cloud Run
#
# Images are tagged with the git commit sha and shared by every environment,
# so a release deploys exactly the image that was built and tested on dev.
#
#   make deploy ENV=staging                   full deploy for the current commit
#   make deploy ENV=production IMAGE_TAG=<sha> deploy a specific commit
#   make build-push-all                       build + push the three images
#   make manage ENV=dev MANAGE_ARGS="shell"   run a manage.py command
# ---------------------------------------------------------------------------

PROJECT=planscape-23d66
REGION=us-central1
ENV=dev
IMAGE_TAG ?= $(shell git rev-parse HEAD)
REGISTRY=us-central1-docker.pkg.dev/$(PROJECT)

# Image being built/pushed. The gateway and frontend-builder targets override these.
APP_NAME=planscape-backend
DOCKERFILE=Dockerfile
DOCKER_IMAGE=$(REGISTRY)/planscape-$(APP_NAME)/$(APP_NAME)
DOCKER_TAG=$(DOCKER_IMAGE):$(IMAGE_TAG)
GATEWAY_VARS=APP_NAME=planscape-gateway DOCKERFILE=Dockerfile.gateway
FRONTEND_BUILDER_VARS=APP_NAME=planscape-frontend-builder DOCKERFILE=Dockerfile.frontend-job

BACKEND_SERVICE=planscape-backend-$(ENV)
GATEWAY_SERVICE=planscape-gateway-$(ENV)
CELERY_WORKER_GENERAL=planscape-celery-worker-general-$(ENV)
CELERY_WORKER_HEAVY=planscape-celery-worker-heavy-$(ENV)
CELERY_BEAT=planscape-celery-beat-$(ENV)
DJANGO_JOB=planscape-django-cmd-$(ENV)
FRONTEND_JOB=planscape-frontend-build-$(ENV)
MANAGE_ARGS=migrate --no-input
FORCE_MIGRATE=0
COMMA=,
EMPTY=
SPACE=$(EMPTY) $(EMPTY)

## Images -------------------------------------------------------------------

image-tag:
	@echo "$(DOCKER_TAG)"

# Exit code tells whether the image for this commit is already in the registry.
image-exists:
	@gcloud artifacts docker images describe $(DOCKER_TAG) >/dev/null 2>&1

# Builds with BuildKit, using the newest image in the repository as cache, and
# embeds inline cache metadata so the next build can reuse this one.
build-push:
	@CACHE_TAG=$$(gcloud artifacts docker images list "$(DOCKER_IMAGE)" --include-tags --filter="tags:*" --sort-by="~UPDATE_TIME" --limit=1 --format="value(tags[0])" 2>/dev/null || true); \
	CACHE_FROM=""; \
	if [ -n "$$CACHE_TAG" ]; then \
		echo "Using build cache from $(DOCKER_IMAGE):$$CACHE_TAG"; \
		CACHE_FROM="--cache-from type=registry,ref=$(DOCKER_IMAGE):$$CACHE_TAG"; \
	fi; \
	docker buildx build --push --platform linux/amd64 --provenance=false \
		--cache-to type=inline $$CACHE_FROM \
		-f $(DOCKERFILE) -t $(DOCKER_TAG) .

# Builds only when the image for this commit is missing.
ensure-image:
	@if $(MAKE) -s image-exists; then \
		echo "Image $(DOCKER_TAG) already exists, skipping build."; \
	else \
		$(MAKE) build-push; \
	fi

image-exists-gateway:
	$(MAKE) -s image-exists $(GATEWAY_VARS)

image-exists-frontend-builder:
	$(MAKE) -s image-exists $(FRONTEND_BUILDER_VARS)

build-push-gateway:
	$(MAKE) build-push $(GATEWAY_VARS)

build-push-frontend-builder:
	$(MAKE) build-push $(FRONTEND_BUILDER_VARS)

ensure-image-gateway:
	$(MAKE) ensure-image $(GATEWAY_VARS)

ensure-image-frontend-builder:
	$(MAKE) ensure-image $(FRONTEND_BUILDER_VARS)

build-push-all:
	$(MAKE) -j3 build-push build-push-gateway build-push-frontend-builder

ensure-images:
	$(MAKE) -j3 ensure-image ensure-image-gateway ensure-image-frontend-builder

## Jobs ---------------------------------------------------------------------

update-job:
	gcloud run jobs update $(JOB) --image $(DOCKER_TAG) --region $(REGION)

update-django-job:
	$(MAKE) update-job JOB=$(DJANGO_JOB)

update-frontend-job:
	$(MAKE) update-job JOB=$(FRONTEND_JOB) $(FRONTEND_BUILDER_VARS)

# Runs any manage.py command on Cloud Run with the image currently set on the job.
manage:
	gcloud run jobs execute $(DJANGO_JOB) --region $(REGION) --args "$(subst $(SPACE),$(COMMA),$(MANAGE_ARGS))" --wait

migrate:
	$(MAKE) manage MANAGE_ARGS="migrate --no-input"

# Skips the migrate job when no migration file changed between the commit
# currently serving BACKEND_SERVICE and IMAGE_TAG. Any doubt (tag that is not
# a sha, commit not reachable, FORCE_MIGRATE=1) falls back to running it.
migrate-if-needed:
	@RUN=1; \
	if [ "$(FORCE_MIGRATE)" != "1" ]; then \
		DEPLOYED=$$(gcloud run services describe $(BACKEND_SERVICE) --region $(REGION) --format='value(spec.template.spec.containers[0].image)' 2>/dev/null | sed 's/.*://'); \
		if echo "$$DEPLOYED" | grep -qE '^[0-9a-f]{40}$$'; then \
			git cat-file -e "$$DEPLOYED" 2>/dev/null || git fetch --quiet --depth=1 origin "$$DEPLOYED" || true; \
			if CHANGED=$$(git diff --name-only "$$DEPLOYED" "$(IMAGE_TAG)" 2>/dev/null) && ! echo "$$CHANGED" | grep -q '/migrations/'; then \
				echo "No migration changes between $$DEPLOYED and $(IMAGE_TAG), skipping migrate."; \
				RUN=0; \
			fi; \
		fi; \
	fi; \
	if [ "$$RUN" = "1" ]; then $(MAKE) migrate; fi

## Services -----------------------------------------------------------------

deploy-service:
	gcloud run services update $(SERVICE) --image $(DOCKER_TAG) --region $(REGION)

deploy-backend-service:
	$(MAKE) deploy-service SERVICE=$(BACKEND_SERVICE)

deploy-celery-general:
	$(MAKE) deploy-service SERVICE=$(CELERY_WORKER_GENERAL)

deploy-celery-heavy:
	$(MAKE) deploy-service SERVICE=$(CELERY_WORKER_HEAVY)

deploy-celery-beat:
	$(MAKE) deploy-service SERVICE=$(CELERY_BEAT)

deploy-gateway:
	$(MAKE) deploy-service SERVICE=$(GATEWAY_SERVICE) $(GATEWAY_VARS)

deploy-services:
	$(MAKE) -j5 deploy-backend-service deploy-celery-general deploy-celery-heavy deploy-celery-beat deploy-gateway

## Deploy -------------------------------------------------------------------

# Backend: point the django job at the new image, migrate when needed, then
# roll backend, celery and gateway to the new image.
deploy-backend:
	$(MAKE) update-django-job
	$(MAKE) migrate-if-needed
	$(MAKE) deploy-services

# Frontend: rebuild the Angular app for ENV and publish it to the bucket.
deploy-frontend:
	$(MAKE) update-frontend-job
	gcloud run jobs execute $(FRONTEND_JOB) --region $(REGION) --wait

# Full deploy of IMAGE_TAG to ENV. Builds whatever image is missing first.
deploy:
	$(MAKE) ensure-images
	$(MAKE) -j2 deploy-backend deploy-frontend


# Reset relevant tables and load development fixture data
load-dev-data:
	./src/planscape/bin/run.sh uv run python manage.py mock_prod_data

dev:
	make -j2 dev-frontend dev-backend

dev-frontend:
	cd src/interface && npm start

dev-backend:
	cd src/planscape && poetry run sh -c "./bin/run_gunicorn.sh"

.PHONY: help taggit install-dependencies-frontend compile-angular build-storybook \
	remove-local-sourcemaps upload-sentry-sourcemaps handle-sentry-uploads e2e-test mypy \
	test-scenarios test-impacts docker-clean docker-hard-clean docker-build docker-test \
	docker-run docker-run-deps docker-stop-deps docker-clean-deps docker-logs-deps docker-shell \
	docker-makemigrations docker-migrate image-tag image-exists build-push ensure-image \
	image-exists-gateway image-exists-frontend-builder build-push-gateway build-push-frontend-builder \
	ensure-image-gateway ensure-image-frontend-builder build-push-all ensure-images update-job \
	update-django-job update-frontend-job manage migrate migrate-if-needed deploy-service \
	deploy-backend-service deploy-celery-general deploy-celery-heavy deploy-celery-beat deploy-gateway \
	deploy-services deploy-backend deploy-frontend deploy load-dev-data dev dev-frontend dev-backend
