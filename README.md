# Planscape

## Introduction
**[Planscape](https://www.planscape.org/)** is a new wildfire resilience planning tool, bringing the best available state and federal data and science together to help regional planners prioritize landscape treatments for mitigating fire risk, maximizing ecological benefits and helping California’s landscapes adapt to climate change.

Please see our [wiki](https://github.com/OurPlanscape/Planscape/wiki) for more information.

## Features
A few of the things you can do in Planscape:

- Visualize HUC-12, fire history boundaries, and more
- Import data layers and shapes for planning
- Toggle on/off map layers
- Save projects to your account
- Share and combine plans with collaborators

## How To Use

### Set Up

#### Install Leaflet and Angular CLI

`pip install psycopg2 django-leaflet`
`pip install django-allauth dj-rest-auth`
`pip install django-rest-framework-jwt`
`pip install djangorestframework-simplejwt`
`npm install @angular/cli`

#### Set up the database connection
`gcert`
`ssh -L 5432:localhost:5432 clearcreek.c.googlers.com`

**In the case of**

> bind [::1]:5432: Address already in use
channel_setup_fwd_listener_tcpip: cannot listen to port: 5432
Could not request local forwarding.

then Postgres is running on your laptop.  Find it with

`ps -u $USER | grep postgres`

and look for a line like

> 479528  3027 ?? 0:17.22 /opt/homebrew/Cellar/postgresql@14/…

and kill the process (for the above example, kill 3027).

### Run Planscape

In one shell, start the Django backend:

`python manage.py runserver`

In another shell, start the Angular frontend:

`n`
`npm install`
`ng serve --open`

Then navigate to **localhost:4200** in your browser.

## Built With

- [PostGIS](https://postgis.net/) - Database for storing user sessions and plans
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