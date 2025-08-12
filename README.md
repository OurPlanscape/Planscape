# INTRODUCTION TO PLANSCAPE — UPDATED 11 AUG 2025

## Introduction — Planscape Product 

**[Planscape](https://www.planscape.org/)** is a new wildfire resilience planning web application built by **[Spatial Informatics Group (SIG)](https://sig-gis.com/)** for the [U.S. Forest Service and partners](https://code.gov/). Planscape brings the best available state and federal data together so regional planners can prioritize landscape treatments that reduce wildfire risk, maximize ecological benefits, and help communities adapt to climate change. 

Please see our [wiki](https://github.com/OurPlanscape/Planscape/wiki) for more product information.


## Planscape Docs Organization 

```bash
`README.md` <--- # you are here.
`CONTRIBUTING.md`
`docs/`
 ├─ `setup_planscape_locally.md`
 └─ etc.
```

## Key Features

- Visualization of relevant **data layers** and **base layers** on a web-based **base map**
- Generate project plans and highlight areas with the best management potential via the **ForSys** model
- Analytics of the expected benefit over time from applying treatment  
- Share and combine plans with collaborators


## Built With

- [Angular](https://angular.io/) — frontend framework
- [Ansible](https://www.ansible.com/) — deployment & configuration automation
- [black](https://black.readthedocs.io/en/stable/) — Python code formatter
- [Celery](https://docs.celeryq.dev/) — task queue for background jobs
- [Django REST framework](https://www.django-rest-framework.org/) — backend API framework
- [django-extensions](https://github.com/django-extensions/django-extensions) — useful dev management commands
- [Docker & Docker Compose](https://www.docker.com/) — local development & runtime
- [ForSys](https://github.com/forsys-sp/forsysr) — optimization package for land-management planning
- [GDAL](https://gdal.org/) — geospatial data processing (raster/vector)
- [GitHub Actions](https://github.com/features/actions) — CI/CD (tests, linting, builds)
- [Leaflet](https://leafletjs.com/) — interactive maps & layers
- [Mapbox](https://www.mapbox.com/) — basemap tiles
- [Martin](https://maplibre.org/martin/) — vector-tile server
- [PostGIS](https://postgis.net/) — database (with PostgreSQL) for storing geometry, user sessions, and plans
- [PROMOTe](https://www.fs.usda.gov/psw/topics/restoration/tcsi/publications/TCSI-Blueprint.pdf) — computes conditions and identifies potential treatment areas
- [Redis](https://redis.io/) — cache & message broker
- [Sentry](https://sentry.io/) — frontend error monitoring


## Next Step: Contributing & Docs

Continue with [CONTRIBUTING.md](CONTRIBUTING.md) for Planscape's workflow pattern. Next, for local setup, see the docs in the [docs](docs) folder, particularly the [setup-planscape-locally.md](docs/setup_planscape_locally.md) file.


## Public Domain

- This project is in the worldwide [public domain](LICENSE.md).
- This project is in the United States public domain, and worldwide rights are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
- All contributions are released under the CC0 dedication. By submitting a pull request, you agree to this waiver.