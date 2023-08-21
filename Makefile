# Authors: 
# - RJ Sheperd (rsheperd@sig-gis.com)
# - George Silva (gsilva@sig-gis.com)

# User Systemd Service (see: ~/.config/systemd/user/planscape.service)
SERVICE=planscape

# Directory which NGINX serves up for planscape
PUBLIC_WWW_DIR=/var/www/html/planscape/

# Systemd User Control
SYS_CTL=systemctl --user
TAG=main

checkout:
	git fetch origin; \
	git switch main; \
	git pull origin main; \
	git checkout $(TAG)

taggit:
	git checkout main; \
	git pull origin main; \
	git tag -a $(VERSION); \
	git push origin --tags

compile-angular:
	cd src/interface && npm run build -- --configuration production --output-path=./dist/out

deploy-frontend: compile-angular
	cp -r ./src/interface/dist/out/** ${PUBLIC_WWW_DIR}

migrate:
	cd src/planscape && python3 manage.py migrate --no-input

load-conditions:
	cd src/planscape && python3 manage.py load_conditions

load-metrics:
	cd src/planscape && python3 manage.py load_metrics

load-rasters:
	cd src/planscape && python3 manage.py load_rasters

deploy-backend: migrate load-conditions restart

deploy-all: deploy-backend deploy-frontend

start:
	${SYS_CTL} start ${SERVICE}

stop:
	${SYS_CTL} stop ${SERVICE}

status:
	${SYS_CTL} status ${SERVICE}

reload:
	${SYS_CTL} daemon-reload

restart: reload stop start

nginx-restart:
	sudo service nginx restart