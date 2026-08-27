UID ?= $(shell id -u)
GID ?= $(shell id -g)
export UID GID

# User Systemd Service (see: ~/.config/systemd/user/planscape.service)
SERVICE=planscape

# Directory which NGINX serves up for planscape
PUBLIC_WWW_DIR=/var/www/html/planscape/

# Directory which NGINX serves up for storybook
STORYBOOK_WWW_DIR=/var/www/html/storybook/

# Systemd User Control
SYS_CTL=systemctl --user
TAG=main
VERSION="$$(date '+%Y.%m.%d')-$$(git log --abbrev=10 --format=%h | head -1)"
E2E_IMPACTS=impacts_e2e_config.json

help:
	@echo 'Available commands:'
	@echo ''
	@echo 'build ................................ Builds image'
	@echo 'run .................................. Runs the webserver'
	@echo 'test ................................. Runs all tests except integration'
	@echo 'lock ................................. Locks the versions of dependencies.'
	@echo ''

checkout:
	set -e; \
	git fetch origin; \
	git switch main; \
	git pull origin main; \
	git checkout $(TAG); \
	echo "Completed git checkout"

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

deploy-frontend-with-sentry: install-dependencies-frontend compile-angular handle-sentry-uploads
	@echo "Copying build to web directory..."; \
	cp -r ./src/interface/dist/out/** ${PUBLIC_WWW_DIR}

deploy-frontend: install-dependencies-frontend compile-angular handle-sentry-uploads
	@echo "Copying build to web directory..."; \
	cp -r ./src/interface/dist/out/** ${PUBLIC_WWW_DIR}

deploy-storybook: install-dependencies-frontend build-storybook
	cp -r ./src/interface/storybook-static/** ${STORYBOOK_WWW_DIR}

e2e-test:
	cd src/interface && npx playwright test

mypy:
	mypy . --strict --ignore-missing-imports | grep src/ | wc -l

migrate:
	uv run --directory=src/planscape manage.py migrate --no-input
	uv run --directory=src/planscape manage.py collectstatic --no-input

install-dependencies-backend:
	uv sync --locked --no-install-project --dev
	uv run opentelemetry-bootstrap --action=install

deploy-backend: install-dependencies-backend migrate restart

deploy-backend-wo-migration: install-dependencies-backend restart

deploy-all: deploy-backend deploy-frontend

start-celery:
	${SYS_CTL} start celery-* --all

stop-celery:
	${SYS_CTL} stop celery-* --all

status-celery:
	${SYS_CTL} status celery-* --all

start:
	${SYS_CTL} start ${SERVICE}

stop:
	${SYS_CTL} stop ${SERVICE}

status:
	${SYS_CTL} status ${SERVICE}

reload:
	${SYS_CTL} daemon-reload

restart: reload stop-celery stop start start-celery

nginx-restart:
	sudo service nginx restart

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
	./src/planscape/bin/run.sh uv run python manage.py test $(TEST)

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


# Cloud Run commands

PROJECT=planscape-23d66
APP_NAME=planscape-backend
DOCKERFILE=Dockerfile
ENV=dev
APP=$(APP_NAME)-$(ENV)
DOCKER_REPO=planscape-$(APP_NAME)
DOCKER_IMAGE=us-central1-docker.pkg.dev/$(PROJECT)/$(DOCKER_REPO)/$(APP_NAME)
DOCKER_TAG=$(DOCKER_IMAGE):$(VERSION)
REGION=us-central1
CELERY_WORKER_GENERAL=planscape-celery-worker-general-$(ENV)
CELERY_WORKER_HEAVY=planscape-celery-worker-heavy-$(ENV)
CELERY_BEAT=planscape-celery-beat-$(ENV)
DJANGO_JOB=planscape-django-cmd-$(ENV)
MANAGE_ARGS=migrate --no-input
COMMA=,
EMPTY=
SPACE=$(EMPTY) $(EMPTY)

cloud-run-build:
	@BUILDS=$$(gcloud builds list --filter="images:$(DOCKER_TAG)" --format=json); \
	if [ "$$BUILDS" = "[]" ]; then \
		echo "Building image with tag $(DOCKER_TAG).";\
		docker build -f $(DOCKERFILE) -t $(DOCKER_TAG) .;\
	else \
		echo "Docker image already pushed to artifact repo (tag: $(DOCKER_TAG))";\
	fi;

cloud-run-build-force:
	docker build -f $(DOCKERFILE) -t $(DOCKER_TAG) .

cloud-run-push:
	@BUILDS=$$(gcloud builds list --filter="images:$(DOCKER_TAG)" --format=json); \
	if [ "$$BUILDS" = "[]" ]; then \
		CACHE_TAG=$$(gcloud artifacts docker images list "$(DOCKER_IMAGE)" --include-tags --filter="tags:*" --sort-by="~UPDATE_TIME" --limit=1 --format="value(tags[0])" 2>/dev/null || true); \
		CACHE_FROM=""; \
		if [ -n "$$CACHE_TAG" ]; then \
			CACHE_FROM="$(DOCKER_IMAGE):$$CACHE_TAG"; \
			echo "Using Docker cache from $$CACHE_FROM ."; \
		else \
			echo "No existing Docker image found for cache."; \
		fi; \
		echo "Pushing image $(DOCKER_TAG) ."; \
		gcloud builds submit --config cloudbuild.dockerfile.yaml --substitutions _DOCKERFILE=$(DOCKERFILE),_IMAGE=$(DOCKER_TAG),_CACHE_FROM=$$CACHE_FROM .;\
	else \
		echo "Image $(DOCKER_TAG) already submitted"; \
	fi;

cloud-run-deploy:
	gcloud run deploy $(APP) --image $(DOCKER_TAG) --platform managed --region $(REGION)

cloud-run-update-job:
	gcloud run jobs update $(JOB) --image $(DOCKER_TAG) --region $(REGION)

cloud-run-build-deploy: cloud-run-build cloud-run-push cloud-run-deploy

cloud-run-docker-tag:
	echo "$(DOCKER_TAG)"


cloud-run-deploy-celery-general:
	gcloud run services update $(CELERY_WORKER_GENERAL) --image $(DOCKER_TAG) --region $(REGION)

cloud-run-deploy-celery-heavy:
	gcloud run services update $(CELERY_WORKER_HEAVY) --image $(DOCKER_TAG) --region $(REGION)

cloud-run-deploy-celery-beat:
	gcloud run services update $(CELERY_BEAT) --image $(DOCKER_TAG) --region $(REGION)

cloud-run-deploy-celery: cloud-run-push cloud-run-deploy-celery-general cloud-run-deploy-celery-heavy cloud-run-deploy-celery-beat


cloud-run-update-django-job:
	$(MAKE) cloud-run-update-job JOB=$(DJANGO_JOB)

cloud-run-execute-django-job:
	gcloud run jobs execute $(DJANGO_JOB) --region $(REGION) --args "$(subst $(SPACE),$(COMMA),$(MANAGE_ARGS))" --wait

cloud-run-deploy-django-job: cloud-run-push cloud-run-update-django-job


cloud-run-build-gateway:
	$(MAKE) cloud-run-build APP_NAME=planscape-gateway DOCKERFILE=Dockerfile.gateway DOCKER_REPO=planscape-planscape-gateway

cloud-run-push-gateway:
	$(MAKE) cloud-run-push APP_NAME=planscape-gateway DOCKERFILE=Dockerfile.gateway DOCKER_REPO=planscape-planscape-gateway

cloud-run-deploy-gateway:
	$(MAKE) cloud-run-deploy APP_NAME=planscape-gateway DOCKERFILE=Dockerfile.gateway DOCKER_REPO=planscape-planscape-gateway

cloud-run-docker-tag-gateway:
	$(MAKE) cloud-run-docker-tag APP_NAME=planscape-gateway DOCKER_REPO=planscape-planscape-gateway


cloud-run-build-frontend-job:
	$(MAKE) cloud-run-build APP_NAME=planscape-frontend-builder DOCKERFILE=Dockerfile.frontend-job DOCKER_REPO=planscape-planscape-frontend-builder

cloud-run-push-frontend-job:
	$(MAKE) cloud-run-push APP_NAME=planscape-frontend-builder DOCKERFILE=Dockerfile.frontend-job DOCKER_REPO=planscape-planscape-frontend-builder

cloud-run-update-frontend-job:
	$(MAKE) cloud-run-update-job JOB=planscape-frontend-build-$(ENV) APP_NAME=planscape-frontend-builder DOCKERFILE=Dockerfile.frontend-job DOCKER_REPO=planscape-planscape-frontend-builder

# Deploy front-end
cloud-run-execute-frontend-job:
	gcloud run jobs execute planscape-frontend-build-$(ENV) --region $(REGION) --wait

cloud-run-deploy-frontend-job: cloud-run-push-frontend-job cloud-run-update-frontend-job cloud-run-execute-frontend-job

cloud-run-docker-tag-frontend-job:
	$(MAKE) cloud-run-docker-tag APP_NAME=planscape-frontend-builder DOCKER_REPO=planscape-planscape-frontend-builder


cloud-run-build-all:
	$(MAKE) cloud-run-build
	$(MAKE) cloud-run-build-gateway
	$(MAKE) cloud-run-build-frontend-job

cloud-run-push-all:
	$(MAKE) -j3 cloud-run-push cloud-run-push-frontend-job cloud-run-push-gateway

# TODO: Add migration step after Jenkins decomissioning [ $(MAKE) cloud-run-execute-django-job MANAGE_ARGS="migrate --no-input" ]
cloud-run-deploy-all:
	$(MAKE) cloud-run-push-all
	$(MAKE) cloud-run-update-django-job 
	$(MAKE) cloud-run-execute-django-job MANAGE_ARGS="migrate --no-input"
	$(MAKE) -j6 cloud-run-deploy-celery-general cloud-run-deploy-celery-heavy cloud-run-deploy-celery-beat cloud-run-deploy cloud-run-deploy-gateway cloud-run-update-frontend-job
	$(MAKE) cloud-run-execute-frontend-job


# Reset relevant tables and load development fixture data
load-dev-data:
	./src/planscape/bin/run.sh uv run python manage.py mock_prod_data

dev:
	make -j2 dev-frontend dev-backend

dev-frontend:
	cd src/interface && npm start

dev-backend:
	cd src/planscape && poetry run sh -c "./bin/run_gunicorn.sh"

.PHONY: all docker-build docker-test docker-run docker-shell docker-makemigrations docker-migrate load-dev-data
