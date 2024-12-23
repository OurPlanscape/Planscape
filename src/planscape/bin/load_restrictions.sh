#!/usr/bin/env bash
# this script usually will be executed by make load-restrictions and it will cd into src/planscape
python3 manage.py load_restrictions --input-file ../../data/wilderness_area.shp --type WILDERNESS_AREA
python3 manage.py load_restrictions --input-file ../../data/private_lands.shp --type PRIVATE_LANDS
python3 manage.py load_restrictions --input-file ../../data/state_parks.shp --type STATE_PARKS
python3 manage.py load_restrictions --input-file ../../data/national_parks.shp --type NATIONAL_PARKS
python3 manage.py load_restrictions --input-file ../../data/tribal_lands.shp --type TRIBAL_LANDS
python3 manage.py load_restrictions --input-file ../../data/national_forests.shp --type NATIONAL_FORESTS
