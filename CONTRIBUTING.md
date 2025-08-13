# CONTRIBUTING TO PLANSCAPE

## Introduction — Contributing to Planscape

Welcome, and thank you for improving **[Planscape](https://www.planscape.org/)**, an open-source landscape-planning web application built by *
*[Spatial Informatics Group (SIG)](https://sig-gis.com/)** for the [U.S. Forest Service and partners](https://code.gov/).

## Planscape Docs Organization

```bash
`README.md` 
`CONTRIBUTING.md` <--- # you are here.
`docs/`
  ├─ `setup_planscape_locally.md`
  └─ etc.
```

## Contributing Policies

- **Code of Conduct:** We follow the [TTS Code of Conduct](https://18f.gsa.gov/code-of-conduct/). Be excellent to each other.
- **Open Source Policy:** We adhere to the [18F Open Source Policy](https://github.com/18f/open-source-policy).
- **Vulnerability Disclosure:** Please review the [18F Vulnerability Disclosure Policy](https://18f.gsa.gov/vulnerability-disclosure-policy/).

### Coding Standards

- **Python**: type-annotate; format with `black`; keep functions small and testable.
- **Angular/TypeScript**: keep ESLint clean; prefer small, testable components and services.
- **Tests**: write and maintain unit tests; CI runs them automatically in GitHub.
- **Reviews**: at least one maintainer approval of pull request before merge using the github.com interface.
- **Docs**: update docs when you add a non-obvious dev step or concept.

## Architecture at a Glance

```bash
| Layer        | Tech (current)                                    | Purpose                                                |
|--------------|---------------------------------------------------|--------------------------------------------------------|
| Database     | PostgreSQL + PostGIS                              | Geometry, plans, scenarios, auth                       |
| API          | Django REST Framework                             | REST/JSON endpoints & business logic                   |
| Frontend     | Angular + Leaflet                                 | Interactive map & scenario editor                      |
| Tiles        | Martin (vector tiles) / Mapbox (basemap)          | Serve tiles to the client                              |
| Background   | Celery + Redis                                    | Heavy analysis, batch jobs, exports                    |
```

**Recommended resources**:

- [Django tutorial](https://docs.djangoproject.com/en/stable/intro/tutorial01/)
- [Maplibre Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [Angular + Maplibre docs](https://github.com/maplibre/ngx-maplibre-gl)

## Brief Repo Tour

```bash
`Planscape/`
├── `.github/` # CI workflows, issue/PR templates
├── `analysis/` # ForSys algorithm code and docs, written in R
├── `docs/` # Deep-dive docs (local set up, architecture, glossary, etc.)
├── `docker-compose.yml` # Local stack (db, api, tiles, ui)
├── `Makefile` # One-liner dev commands (make help)
├── `src/`
  ├── `interface/` # Angular app (frontend)
  ├── `planscape/` # Django project (apps/, settings/)
  └── `forsys/` # ForSys server access
```

### GitHub Account

Use an account that will persist (e.g., a personal account not tied to an employer). Ask a maintainer to add you to
the [Planscape team](https://github.com/orgs/OurPlanscape/people) for write access.

## TL;DR Set Up — run the whole stack (Docker)

```bash
# clone & enter
git clone git@github.com:OurPlanscape/Planscape.git # SSH access
git clone https://github.com/OurPlanscape/Planscape.git # HTTPS access
cd Planscape

# build images & apply migrations
make docker-build
make docker-migrate

# start services (API :8000 • UI :4200)
make docker-run

# (optional) seed sample data
make load-dev-data
```

## Developer Workflow

To make a new branch:

```bash
git checkout -b plan-<ticket>-short-slug
```

To style Python files with black manually:

```bash
black src/planscape/planning/models.py # specific path of file to format
```

To run unit tests inside Docker web container:

```bash
docker exec -it planscape-web-1 bash
python manage.py test # run all tests 
python manage.py <app>.tests.<test_class>.<test_name> # run tests in a app/class/test
```

Commit conventions:

```bash
PLAN-<xyz>: short-descriptive-slug-of-commit
```

## Pull-Request Checklist

- CI green (lint, type-checks, tests)
- At least one maintainer approval
- squash-merge preferred
- Update docs/CHANGELOG when behavior or schema changes

## Releases

- Merge PRs to main → CI builds and tests
- Tag a release via terminal and submit its tag to: https://github.com/OurPlanscape/Planscape/releases
- If cleared to do so, enable VPN and deploy via Jenkins to staging/production

## Planscape Key Glossary Terms

- **Data Layer**: relevant raster/vector dataset used in Explore/analysis (e.g., fire probability).
- **Base Layer**: background raster/vector dataset used under data layers (e.g., private land)
- **Planning Area**: user-selected land area with management objectives
- **Scenario**: a saved ForSys run for a Planning Area with a specific treatment goal (e.g., area with aboveground carbon).
- **Project Areas**: areas in the Planning Area selected by ForSys as best to manage under a specific Scenario.
- **Treatment Plan**: specific treatment applied to a Project Area(s) (e.g., moderate thinning).
- **Scenario Analytics**: results of applying your Treatment Plan to your Project Areas.
- More definitions: see `https://github.com/OurPlanscape/Planscape/wiki/Glossary`.

## Next Step: Local Setup

Next, to set up Planscape locally, see the docs in the [docs](docs) folder, particularly
the [setup_planscape_locally.md](docs/setup_planscape_locally.md) file. If you haven’t already, read the [README](README.md) for an introduction to
the Planscape product, and a link to its Wiki.

## Public Domain

- This project is in the worldwide [public domain](LICENSE.md).
- This project is in the United States public domain, and worldwide rights are waived through
  the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
- All contributions are released under the CC0 dedication. By submitting a pull request, you agree to this waiver.
