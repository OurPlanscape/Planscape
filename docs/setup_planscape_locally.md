# PLANSCAPE LOCAL DEV ENV — UPDATED 11 AUG 2025

## Introduction - Local Planscape Setup

The following are instructions for getting **[Planscape](https://www.planscape.org/)** running on your machine for development. Let's get started.


## Planscape Docs Organization 

```bash
`README.md` 
`CONTRIBUTING.md`
`docs/`
  ├─ `setup_planscape_locally.md` <--- # you are here.
  └─ etc.
```


## Docker & Docker Compose

We structured Planscape to have a corresponding Dockerfile, that includes all the necessary
dependencies to run and develop Planscape locally. Right now, only the backend part of Planscape
is being built with Docker. We have a plan to create another Dockerfile to enable front-end
developer to easily collaborate.


## Requirements

1. Docker & Docker Compose


## How to develop using Docker

Make sure you have all the requirements in the previous section installed in your machine.

1. Clone the repository from GitHub
2. Create your `.env` file in the project repository root. You can copy the `.sample.env` file and tweak some of the environment variables, if necessary. All the `PLANSCAPE_DATABASE_*` variables are correctly configured for the Dockerfile.
3. Create a new `features.dev.json` file. This file should be located in `<repo>/src/interface/src/app/features/`. You can copy the contents of `<repo>/src/interface/src/app/features/features.json`. This file controls all the front-end feature flags in build time.
4. Create a new `environment.dev.ts` file. This file should be located in `<repo>/src/interface/environments/`. You can copy the contents of `<repo>/src/interface/src/app/environments/environment.ts`. This file controls all the ENV variables for the front-end in build time.
5. Create a `proxy.conf.json` file, This file should be located in `<repo>/src/interface`,  configures the frontend to route API requests to the backend during local development. You can copy the contents of `<repo>/src/interface/proxy.conf.template.json` and updating the target field to point to your backend URL.

After cloning the repository, and setting up your `.env` file you can spin an environment
by issuing the following commands in your terminal of choice.  We assume that `<project-root>`
is the root of the repository. 

```bash
cd ~/<project-root>
make docker-build
make docker-migrate
make docker-run
```

and in other terminal run:
```bash
make load-dev-data
```

That is all it should take for you to have the running server on your machine. The repository root
is mapped to the root docker volume, so any changes you make in your repository will be reflected
instantly in the running application.


## Useful commands

Most of the common operations needed to maintain a Django application have been wrapped in the Makefile.
Using make commands you can generate migrations, apply them, spin up the server and clean docker images if necessary.

Here's a list of the commands implemented so far:

* `make docker-clean` - shuts down docker compose and remove all information about the containers
* `make docker-hard-clean` - runs `docker-clean` and prunes the images for this project
* `make docker-build` - builds all the containers listed in the docker compose file
* `make docker-test` - runs all python's tests inside the container
* `make docker-run` - spins up docker compose and starts the server in port 8000
* `make docker-shell` - opens up a terminal inside the container
* `make docker-makemigrations` - creates all pending migrations. you can specify an `APP_LABEL` to choose specific Django apps
* `make docker-migrate` - executes all pending migrations
* `make load-dev-data` - add all catalogs in database


## Local development environment

The instructions below have been developed using MacOS.  It should be straightforward
to adapt them to other environments (e.g., Linux, Windows).

During installation of packages you may be asked to modify directory permissions
(e.g., sudo chmod ...).


## Install Python and GDAL

First you must install Python and GDAL.  On MacOS,

* Install homebrew from a terminal window

  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/$USER/.profile
  ```

* Install Python 3.10 (or later):
  ```bash
  brew reinstall python@3.10
  ```
Please read the install output carefully since most of the installs are dependent on python 3.10+.  You can check to see if it installed properly in /usr/local/bin/.

* Install GDAL (necessary for processing raster GIS data):
  ```bash
  brew install gdal
  ```


## Source code structure

The directory structure will look like

```bash
env/                        # Python environment
  bin/                      # Python env binaries
  include/                  # Python env includes
  lib/                      # Python env libraries
  share/                    # Python env share
  pyvenv.cfg                # Python env configuration
  .git/                     # Local Git repository
  Planscape/                # Project root in GitHub
    CONTRIBUTING.md
    LICENSE.md
    README.md
    analysis/               # Experimental analyses
    doc/                    # Documentation files
    mypy.ini                # Configuration for Python type system
    src/
      .gitignore            # Git configuration for files to ignore
      deployment/           # Scripts for deployment to AWS, etc.
      docker-compose.yaml   # Docker file
      interface/            # Angular frontend
      planscape/            # Django backend
```


## Set up Python

In a terminal window,

* Make a virtual environment ```env``` in a fresh directory:
  ```bash
  python3 -m venv env
  ```

* Check that the file env/pyvenv.cfg has the following or similar contents:
  ```bash
  home = /opt/homebrew/opt/python@3.10/bin
  include-system-site-packages = false
  version = 3.10.6
  ```

* Use the following command to start using Python in the environment:
  ```bash
  source env/bin/activate
  ```

  **TIP**: Create an alias to this command, e.g.,
  ```bash
  alias startdev="source env/bin/activate"
  ```


## Set up Service Software

Before you can do something with the software, you'll want to install Postgres and R.


## Install PostgreSQL (at least version 14)

```bash
brew install postgresql
```
Note: you might need to provide the version number when installing: 
```bash
brew install postgresql@15
```

You will also need to install PostGIS if you installed postgresql via homebrew.
```bash
brew install postgis
```

Alternatively you can install postgresql from [postgresapp](https://postgresapp.com/downloads.html) which already includes PostGIS.


## Install R

You'll want R, but you also need to install a bunch of prerequisite libraries through brew:
```bash
brew install libgit2
brew install harfbuzz
brew install fribidi
brew install udunits
brew install r
```

After you have installed R, run r and install more libraries.  There are plenty of R mirrors around the world; choose one close to you.
```bash
% r
> install.packages("dplyr")
> install.packages("textshaping")
> install.packages("stringi")
> install.packages("ggnewscale")
> install.packages("udunits2")
> install.packages("sf")
> install.packages("ragg")
> install.packages("pkgdown")
> install.packages("devtools")
> install.packages("DBI")
> install.packages("RPostgreSQL")
> install.packages("optparse")
> install.packages("rjson")
> install.packages("glue")
> install.packages("purrr")
> install.packages("dplyr")
> install.packages("logger")
```

Warning: devtools is enormous.  Get a cup of coffee when you do this.  You may encounter other missing
libraries, and so be ready to install those and re-install devtools.  After installing devtools, go back to r
and install the forsys libraries:

```bash
% r
> devtools::install_github("forsys-sp/forsysr")
> devtools::install_github("forsys-sp/patchmax")
```


## Download the source code

The Planscape source code is stored in GitHub, which provides support for code reviews,
continuous integration, deployment, etc.  The [OurPlanscape/Planscape](https://github.com/OurPlanscape/Planscape) GitHub Repository contains the code, and the [Planscape develoment](https://github.com/orgs/OurPlanscape/projects/1) GitHub project contains the issues and
bugs.

In order to check in/review code or create issues, you will need a GitHub account
that is a member of the [OurPlanscape](https://github.com/OurPlanscape) organization. 
If you don't already have a GitHub account, please create one and ask own of the owners
of the GitHub repository to add you to the organization.

Our repository requires that you connect via SSH rather than https.  You can download code via https but without SSH you won't be able to merge changes in.


## Install SSH Key (possibly optional)

Use the email address you used for your github account:
```bash
ssh-keygen -t ed25519 -C "your_email@your_domain.com"
```
You can ignore any fancy ASCII artwork that shows up in your terminal.

Follow the [Github instructions](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)
on how to apply the public key you just generated into your github account.

For more info, Github's full docs on installing SSH keys can be found
[here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account).


## Get the source code

To download the source code, run the following commands in your terminal window:
```bash
cd env
git init
git remote add origin git@github.com:OurPlanscape/Planscape.git
git clone ssh://git@github.com/OurPlanscape/Planscape.git
```

If you intend on making modifications, see instructions on how to make your own branch.


## Install More Planscape-specific Libraries — Install pip

If you do not have pip installed, this will fail:
```bash
pip --version
```
In that case, you will need to install pip.  For macOS, you will have to "bootstrap" pip; instructions
can be found [here](https://www.geeksforgeeks.org/how-to-install-pip-in-macos/).


## Download the Python dependencies:

```bash
cd Planscape/src/planscape/
python -m pip install --upgrade pip
pip install poetry setuptools && python3 -m poetry export -f requirements.txt --with dev --without-hashes --output requirements.txt && pip install -r requirements.txt
```


## Install Frontend Libraries and Services

npm is a tool to manage javascript libraries (including more Angular code).

```bash
brew install npm
```

Note that if you are asked for PATH_TO_ENV, typically that's your home directory path,
e.g. /home/$USER.

Finally, download the necessary Angular libraries (which includes ng). You may be required to install Node JS.
Depending on your operating system you can find the exact steps
[here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

```bash
cd ../interface
npm install -g @angular/cli
```


## Linting & Formatting (Python)

If you're not using VSCode, you will need to install `black` (automatically installed as part of the `requirements.txt`)
and use it before commiting your code.

To do so, you can do:

```bash
cd src/planscape
black .
```

That will reformat any necessary files.


#### Install VSCode (optional)

VSCode is very helpful for developing both frontend and backend code.  It provides syntax highlighting,
code completion, and type checking.

Some additional setup steps:

1. Install mypy and dmypy (the mypy daemon)
```bash
brew install mypy
```

2. Create a file
   ```
   env/.env
   ```
   with the contents
   ```
   PYTHONPATH=Planscape/src/planscape
   ```

3. Create a settings file
   ```
   env/.vscode/settings.json
   ```
   with the following contents (replacing PATH_TO_ENV):
   ```
   {
    "python.linting.mypyEnabled": true,
    "python.envFile": "${workspaceFolder}/.env",
    "python.linting.enabled": true,
    "mypy.dmypyExecutable": "PATH_TO_ENV/env/bin/dmypy",
   }
   ```
4. In VS Code, install the Python and Pylance extensions (⇧⌘X).
5. Install [black formatter](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter)
6. Configure VS Code to auto-format when saved.


Helpful tip: VS Code also has useful linter extensions that can be installed for [Typescript](https://code.visualstudio.com/docs/languages/typescript#_linters) files and a built-in formatter for [JSON ](https://code.visualstudio.com/docs/languages/json#_formatting) files.


## How to run black?

`black` is a uncompromising code formatter. For us to have a standardized repository, black is being used
as the sole formatter.

During CI we will check if this passes `black` formatting. If it fails, it will stop the build.

This only affects GitHub actions - so we won't be able to merge if it fails.

You should run locally before your commits. You can do so by:

```bash
cd src/planscape
black .
```


## Set environment variables

## Backend

Create a Python config file: ```src/planscape/planscape/.env``` with the contents
```bash
SECRET_KEY = 'some string'
PLANSCAPE_DATABASE_HOST = 'localhost'
PLANSCAPE_DATABASE_PASSWORD = 'your postgres password'
```
The SECRET_KEY is what django uses for signing requests, and provides protection against XSRF and other attacks.  You can set it to anything.  You can read [here](https://docs.djangoproject.com/en/4.2/ref/settings/#std:setting-SECRET_KEY) for more details.

If you don't want to use your local database, there is a shared developer instance of postgres.  Please contact a team member to get the PLANSCAPE_DATABASE_.* values if you want to use that instance instead.


## Frontend

The angular code reads two kinds of files that can contain settings that are specific to the environment or development box.
1. features.json
The features.dev.json (and features.json) file (located in src/interface/src/app/features) contains feature flags, which can be used to show or hide certain features in the UI.  **You must add a features.dev.json file for angular to behave correctly.**
You can find more details in the [features.json readme](https://github.com/OurPlanscape/Planscape/blob/main/src/interface/src/app/features/README.md).
2. environment.ts
The environment.dev.ts file (or environment.prod.ts file), found in src/interface/src/environments/, contains server-side settings for the frontend (such as a Google Analytics ID). Similarly to `features.json` **you'll need to add a `environment.dev.ts` file for angular to load this variables on dev mode**.
3. proxy.conf.json 
The proxy.conf.json file, found in src/interface/, configures the frontend to route API requests to the backend during local development. You must add a proxy.conf.json file by copying proxy.conf.template.json and updating the target field to point to your backend URL.

You can edit your files such as:


## features.dev.json sample (as of Aug 30 2023)

Add this to src/interface/src/app/features if you don't have it yet.
```bash
{
  "login": true,
  "new_navigation": true,  
  "show_centralcoast": true,
  "show_future_control_panel": false,
  "show_socal": true,
  "show_translated_control_panel": false,
  "testFalseFeature": false,
  "testTrueFeature": true,
  "top_percent_slider": true,
  "unlaunched_layers": false,
  "upload_project_area": false,
  "use_its": false
}
```


## environment.ts example

```bash
export const environment = {
  environment: '',
  production: false,
  backend_endpoint: 'http://localhost:8000/planscape-backend',
  google_analytics_id: '',
  tile_endpoint: 'http://localhost:3000/',
  download_endpoint: '',
  martin_server: 'http://localhost:3000/',
  mapbox_key: '',
  open_panel_key: '',
  open_panel_enabled: false,
  debug_layers: false,
  sentry: {
    dsn_url: '',
    enable_extra_error_data: true,
    enable_httpclient: true,
    enable_browser_reporting: true,
    enable_interventions_reporting: true,
    enable_crash_reporting: true,
    enable_profiling: false,
    traces_sample_rate: 0.0,
    profiling_sample_rate: 0.0,
    enable_context_lines: false,
    enable_deprecations_reporting: false,
  },
};
```


## Set Up PostGIS (Postgres)

You will need to create the planscape user, database, and populate your DB with tables.
<i>Alternatively</i>, as of Aug 29 2023 there exists a shared developer database running on AWS; please
contact a team member if you want to use that instead.


## Start the DB

```bash
brew services start postgresql
```
You might need to run ```brew tap homebrew/core``` beforehand.


## Planscape users

Connect to the database you just started.  You need to specify the postgres database:
```bash
psql -h localhost -d postgres
```

Now, create the planscape user and database in the psql command line:
```bash
create user planscape with createdb superuser password 'some_password_here';
create database planscape with owner='planscape';
```


## Fill tables

Now, go to src/planscape and run:
```bash
python manage.py migrate
```
This should run a bunch of database migration scripts and populate your database.


## Test

To test that the tables are working properly, run:
```bash
python manage.py test planning
```
This will run the suite of tests in the planning/ directory which will work with the planning area and scenario tables, along with the user tables.


## Test run some tests

From src/planscape, run:
```bash
python manage.py test -p "*test*.py"
```
This should end in "OK"


## Test run the application

In one terminal window or tab, start the Django backend from the ```src/planscape``` directory:
```bash
python manage.py runserver
```

The output should look like
```bash
Watching for file changes with StatReloader
Performing system checks...
System check identified no issues (0 silenced).
September 30, 2022 - 14:28:21
Django version 4.1.1, using settings 'planscape.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

In another shell, start the Angular frontend from the ```src/interface``` directory:
```bash
npm install
ng serve --open
```

Note that npm install may reveal some package vulnerabilities.  It is recommended
that you fix at least those packages that won't break:
```bash
npm audit fix
```

The output should look something like
```bash
✔Browser application bundle generation complete.
Initial Chunk Files   | Names         | Raw Size
vendor.js             | vendor        |   2.84 MB |
polyfills.js          | polyfills     | 318.01 kB |
styles.css, styles.js | styles        | 304.02 kB |
main.js               | main          |  14.94 kB |
runtime.js            | runtime       |   6.52 kB |

                      | Initial Total |   3.47 MB

Build at: 2022-09-30T14:29:12.454Z - Hash: 4158b2a1e75c035d - Time: 3248 ms

** Angular Live Development Server is listening on localhost:4200, open your browser on http://localhost:4200/ **

✔ Compiled successfully.
```

Navigate to localhost:4200 in your browser. You should see the Planscape application.
