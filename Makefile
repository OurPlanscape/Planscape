# Authors: 
# - RJ Sheperd (rsheperd@sig-gis.com)
# - George Silva (gsilva@sig-gis.com)

# User Systemd Service (see: ~/.config/systemd/user/planscape.service)
SERVICE=planscape
FORSYS_QUEUE=forsys-queue
CELERY_FORSYS=celery-forsys-worker
CELERY_DEFAULT=celery-default-worker

# Directory which NGINX serves up for planscape
PUBLIC_WWW_DIR=/var/www/html/planscape/

# Directory which NGINX serves up for storybook
STORYBOOK_WWW_DIR=/var/www/html/storybook/

# Systemd User Control
SYS_CTL=systemctl --user
TAG=main

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
	git tag -a $(VERSION); \
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
    cp -r ./src/interface/storybook-static ${PUBLIC_STORYBOOK_WWW_DIR}

migrate:
	cd src/planscape && python3 manage.py migrate --no-input

load-conditions:
	cd src/planscape && python3 manage.py load_conditions

load-metrics:
	cd src/planscape && python3 manage.py load_metrics

load-rasters:
	cd src/planscape && python3 manage.py load_rasters

install-dependencies-backend:
	pip install -r src/planscape/requirements.txt

deploy-backend: install-dependencies-backend migrate restart

deploy-all: deploy-backend deploy-frontend

start-forsys:
	${SYS_CTL} start ${FORSYS_QUEUE}

stop-forsys:
	${SYS_CTL} stop ${FORSYS_QUEUE}

status-forsys:
	${SYS_CTL} status ${FORSYS_QUEUE}

start-celery:
	${SYS_CTL} start ${CELERY_DEFAULT} --no-block
	${SYS_CTL} start ${CELERY_FORSYS} --no-block

stop-celery:
	${SYS_CTL} stop ${CELERY_DEFAULT}
	${SYS_CTL} stop ${CELERY_FORSYS}

status-celery:
	${SYS_CTL} status ${CELERY_DEFAULT}
	${SYS_CTL} status ${CELERY_FORSYS}

start:
	${SYS_CTL} start ${SERVICE}

stop:
	${SYS_CTL} stop ${SERVICE}

status:
	${SYS_CTL} status ${SERVICE}

reload:
	${SYS_CTL} daemon-reload

restart: reload stop stop-forsys stop-celery start start-forsys start-celery

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

docker-run: docker-build docker-migrate
	docker compose up

docker-shell:
	./src/planscape/bin/run.sh bash

docker-makemigrations:
	./src/planscape/bin/run.sh python manage.py makemigrations --no-header $(APP_LABEL)  $(OPTIONS)
	sudo chown -R $(USER): **/migrations/

docker-migrate:
	./src/planscape/bin/run.sh python manage.py migrate

.PHONY: all docker-build docker-test docker-run docker-shell docker-makemigrations docker-migrate
