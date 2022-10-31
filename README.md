# Planscape

## Introduction
**[Planscape](https://www.planscape.org/)** is a new wildfire resilience planning tool, bringing the best available state and federal data and science together to help regional planners prioritize landscape treatments for mitigating fire risk, maximizing ecological benefits and helping California’s landscapes adapt to climate change.

Please see our [wiki](https://github.com/OurPlanscape/Planscape/wiki) for more information.

## Features
Some of the things you can do in Planscape (WIP):

- Visualize HUC-12, fire history boundaries, and more
- Import data layers
- Toggle on/off map layers
- Highlight areas with best management potential  
- Save projects to your account
- Share and combine plans with collaborators

## Set Up

### Install basic software
From your command line:
```bash
# Install homebrew
/bin/bash -c "$(curl -fsSL \
        https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/usr/local/homebrew/bin/brew shellenv)"' >> \
    /Users/$USER/.profile
eval "$(/usr/local/homebrew/bin/brew shellenv)"

# Install python
brew reinstall python@3.10

# Install GDAL (for processing raster GIS data)
brew install gdal
brew install spatialite-tools
```
### Set up Python

```bash
# Make a virtual environment
mkdir cnra
cd ~/cnra
python3 -m venv env

# Confirm file env/pyvenv.cfg contains: 
#   home = /opt/homebrew/opt/python@3.10/bin
#   include-system-site-packages = false
#   version = 3.10.6

# Note: others have seen slight variations, e.g.,
#   home = /usr/local/opt/python@3.10/bin
#   version = 3.10.7
more env/pyvenv.cfg


# Change to the dev env:
cd ~/cnra; source env/bin/activate

# Add alias to your ~/.profile
echo >> 'alias startdev="cd ~/cnra; source env/bin/activate"' ~/.profile

# Install Python packages 
pip install django djangorestframework
pip install django-stubs django-cors-headers requests
pip install pygments
pip install numpy
pip install typing_extensions
pip install pyshp
pip install matplotlib
pip install rasterio
pip install pytest

#Install Leaflet and Angular CLI
pip install psycopg2 django-leaflet
pip install django-allauth dj-rest-auth
pip install django-rest-framework-jwt
pip install djangorestframework-simplejwt
npm install @angular/cli
```

### Clone this repository

```bash
cd ~/cnra
git remote add origin git@github.com:OurPlanscape/Planscape.git
git clone git@github.com:OurPlanscape/Planscape.git
```

### Set up VS Code

```bash
# Create a file
cat > ~/cnra/env/.env
export PYTHONPATH=~/cnra/env/Planscape/src

# Create a settings file
cat > ~/cnra/env/.vscode/settings.json
{
    "python.testing.pytestEnabled": true,
    "python.testing.unittestEnabled": false,
    "python.linting.mypyEnabled": true,
    "python.envFile": ".env",
    "python.linting.enabled": true,
    "mypy.dmypyExecutable": "~/cnra/env/bin/dmypy",
}

# Create a Python test settings file
cat > ~/cnra/env/pytest.ini
[pytest]
testpaths = planscape
python_files = *test*.py
```

In VS Code, install the Python and Pylance extensions (⇧⌘X).

To test: click on the "beaker" on the left side of VSCode.  The unit tests should run and should pass!  You might have to click twice.

### Usage

#### Set up the database connection
```bash
gcert
ssh -L 5432:localhost:5432 clearcreek.c.googlers.com
```
**In the case of:**
```console
bind [::1]:5432: Address already in use
channel_setup_fwd_listener_tcpip: cannot listen to port: 5432
Could not request local forwarding.
```
then Postgres is running on your laptop.  Find it with

`ps -u $USER | grep postgres`

and look for a line like
```console
479528  3027 ?? 0:17.22 /opt/homebrew/Cellar/postgresql@14/…
```
and kill the process (for the above example, kill 3027).

#### Run Planscape

In one shell, start the Django backend:

```bash
cd ~/cnra/Planscape/src/planscape
python manage.py runserver
```

In another shell, start the Angular frontend:
```bash
n
npm install
ng serve --open
```
Then navigate to **localhost:4200** in your browser.

## Useful Commands 

### Django

```bash
# Make new database schema for upload from the "explore" app
python manage.py makemigrations explore

# Update the database with the new schema for all apps
python manage.py migrate

# Update the database with the new schema for the "explore" app
python manage.py migrate explore

# Remove tables associated with the "explore" app
python manage.py migrate explore zero

# Show the Python model classes associated with the database tables
python manage.py inspectdb

# Starts the server on localhost:8000
python manage.py runserver

# Resets the PostGIS database to empty
python manage.py flush
```

### Angular

```bash
# Add the Material Design components
ng add @angular/material

# Start the server on localhost:4200
ng serve --open

# Create new services
npx @angular/cli generate service marker --skip-tests
npx @angular/cli generate service popup --skip-tests
```

## Built With

- [PostGIS](https://postgis.net/) - database for storing user sessions and plans
- [ESRI](https://www.esri.com/en-us/home) - GIS mapping software, web GIS and geodatabase management applications
- [Django REST framework](https://www.django-rest-framework.org/) - backend framework
- [Angular](https://angular.io/) - frontend framework
- [Leaflet](https://leafletjs.com/) - used to display maps and layers
- [ForSYS](https://www.fs.usda.gov/rmrs/projects/forsys-scenario-planning-model-multi-objective-restoration-and-fuel-management-planning) - linear optimization software package for choosing the best project area for treatment
- [PROMOTe](https://www.fs.usda.gov/psw/topics/restoration/tcsi/publications/TCSI-Blueprint.pdf) - used to compute conditions from basic data, and find new optimal areas for treatment

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md) for additional information.

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.