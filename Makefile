# Authors: 
# - RJ Sheperd (rsheperd@sig-gis.com)
# - George Silva (gsilva@sig-gis.com)

USER_ID = $(shell id -u)

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
GIT_COMMIT_SHA=$(shell git rev-parse HEAD)

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
	@echo "Removing Sourcemaps from build"; \
	rm -rf ./src/interface/dist/out/**.map

# tells sentry about a new tagged release
# uses context in src/interface/.sentryclirc
upload-sentry-sourcemaps:
	@if [ ! -f ".sentryclirc" ]; then \
		echo "Notice: .sentryclirc file not found. Skipping Sentry release notification."; \
		true; \
	elif [ -n "${TAG}" ] && [ "${TAG}" != "main" ]; then \
		echo "${TAG} is a tagged release. Informing Sentry of release"; \
		sentry-cli releases new "${TAG}" \
		sentry-cli sourcemaps inject ./src/interface/dist --release "${TAG}" && \
		sentry-cli sourcemaps upload --release "${TAG}" ./src/interface/dist ;  \
	else \
		sentry-cli releases new "${GIT_COMMIT_SHA}" && \
		sentry-cli sourcemaps inject ./src/interface/dist --release "${GIT_COMMIT_SHA}" && \
		sentry-cli sourcemaps upload --release "${GIT_COMMIT_SHA}" ./src/interface/dist ; \
	fi

handle-sentry-uploads: upload-sentry-sourcemaps remove-local-sourcemaps

deploy-frontend: install-dependencies-frontend compile-angular handle-sentry-uploads
	@echo "Copying build to web directory..."; \
	cp -r ./src/interface/dist/out/** ${PUBLIC_WWW_DIR}
	
deploy-storybook: install-dependencies-frontend build-storybook
	cp -r ./src/interface/storybook-static/** ${STORYBOOK_WWW_DIR}

cypress-test:
	cd src/interface && npm run cypress:run

mypy:
	mypy . --strict --ignore-missing-imports | grep src/ | wc -l

migrate:
	cd src/planscape && python3 manage.py migrate --no-input
	cd src/planscape && python3 manage.py collectstatic --no-input
	cd src/planscape && python3 manage.py install_layers

load-conditions:
	cd src/planscape && python3 manage.py load_conditions

load-metrics:
	cd src/planscape && python3 manage.py load_metrics

load-rasters:
	cd src/planscape && python3 manage.py load_rasters

install-dependencies-backend:
	pip install poetry setuptools && python3 -m poetry export -f requirements.txt --with dev --without-hashes --output requirements.txt && pip install -r requirements.txt

deploy-backend: install-dependencies-backend migrate restart

deploy-all: deploy-backend deploy-frontend

start-celery:
	${SYS_CTL} start celery-* --all

stop-celery:
	${SYS_CTL} stop celery-* --all

status-celery:
	${SYS_CTL} status celery-* --all

stop-martin:
	${SYS_CTL} stop martin.service

start-martin:
	${SYS_CTL} start martin.service

start:
	${SYS_CTL} start ${SERVICE}

stop:
	${SYS_CTL} stop ${SERVICE}

status:
	${SYS_CTL} status ${SERVICE}

reload:
	${SYS_CTL} daemon-reload

restart: reload stop stop-celery start start-celery stop-martin start-martin

nginx-restart:
	sudo service nginx restart

load-restrictions:
	cd src/planscape && sh bin/load_restrictions.sh

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
	./src/planscape/bin/run.sh python manage.py test $(TEST)

docker-run: docker-build
	docker compose up

docker-shell:
	./src/planscape/bin/run.sh bash

docker-makemigrations:
	./src/planscape/bin/run.sh python manage.py makemigrations --no-header $(APP_LABEL) $(OPTIONS)
	find . -type d -name migrations -exec sudo chown -R $(USER): {} +

docker-migrate:
	./src/planscape/bin/run.sh python manage.py migrate
	./src/planscape/bin/run.sh python manage.py install_layers

.PHONY: all docker-build docker-test docker-run docker-shell docker-makemigrations docker-migrate

