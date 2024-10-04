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

deploy-frontend: install-dependencies-frontend compile-angular
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

start:
	${SYS_CTL} start ${SERVICE}

stop:
	${SYS_CTL} stop ${SERVICE}

status:
	${SYS_CTL} status ${SERVICE}

reload:
	${SYS_CTL} daemon-reload

restart: reload stop stop-celery start start-celery

nginx-restart:
	sudo service nginx restart

load-restrictions:
	cd src/planscape && sh bin/load_restrictions.sh

test-scenarios:
	cd src/planscape && python3 manage.py test_scenarios

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
	docker compose build

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

