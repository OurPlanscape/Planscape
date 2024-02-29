# Planscape

## Introduction
**[Planscape](https://www.planscape.org/)** is a new wildfire resilience planning tool, bringing the
best available state and federal data and science together to help regional planners prioritize landscape
treatments for mitigating fire risk, maximizing ecological benefits and helping California’s
landscapes adapt to climate change.

Please see our [wiki](https://github.com/OurPlanscape/Planscape/wiki) for more information.

## Features
Some of the things you can do in Planscape (WIP):

- Visualize the Regional Resource Kit data layers
- Highlight areas with best management potential  
- Generate project plans
- Share and combine plans with collaborators

## Set Up
See the [Development getting started](https://github.com/OurPlanscape/Planscape/wiki/Development-getting-started) guide
for how to download, build, and test Planscape.

## Built With

- [PostGIS](https://postgis.net/) - database for storing user sessions and plans
- [ESRI](https://www.esri.com/en-us/home) - GIS mapping software, web GIS and geodatabase management applications
- [Django REST framework](https://www.django-rest-framework.org/) - backend framework
- [black](https://black.readthedocs.io/en/stable/index.html) - code formatter
- [Angular](https://angular.io/) - frontend framework
- [Leaflet](https://leafletjs.com/) - used to display maps and layers
- [ForSys](https://github.com/forsys-sp/forsysr) - greedy heuristic optimization software package for land management planning and prioritization
- [PROMOTe](https://www.fs.usda.gov/psw/topics/restoration/tcsi/publications/TCSI-Blueprint.pdf) - used to compute conditions from basic data, and find new optimal areas for treatment

## Fun things

We have [django-extensions](https://github.com/django-extensions/django-extensions) installed, so there is a bunch of neat commands there.

Useful ones:

1. python manage.py show_urls
2. python manage.py shell_plus

Check the docs for more.

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

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md) for additional information.

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
