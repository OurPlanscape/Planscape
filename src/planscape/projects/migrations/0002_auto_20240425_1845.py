import json
from pathlib import Path
from django.db import migrations
from django.conf import settings
from projects.models import ProjectVisibility
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon


def get_geometry(region_name):
    filename = f"projects/migrations/{region_name}.geojson"
    with open(filename) as file_handle:
        raw = file_handle.read()
        data = json.loads(raw)
        features = data.get("features")
        feature = features[0]
        geometry_data = feature.get("geometry")
        geometry = GEOSGeometry(json.dumps(geometry_data))
        match geometry.geom_type:
            case "MultiPolygon":
                return geometry
            case "Polygon":
                return MultiPolygon([geometry])
            case _:
                raise ValueError(
                    "this geometry is not right for a region. must be a polygon or multipolygon."
                )


def data():
    return [
        (
            "sierra-nevada",
            "Sierra Nevada",
            ProjectVisibility.PUBLIC,
        ),
        (
            "southern-california",
            "Southern California",
            ProjectVisibility.PUBLIC,
        ),
        (
            "northern-california",
            "Northern California",
            ProjectVisibility.PUBLIC,
        ),
        (
            "central-coast",
            "Central Coast",
            ProjectVisibility.PUBLIC,
        ),
    ]


def create_projects(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0001_initial"),
        ("organizations", "0002_auto_20240425_1716"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [migrations.RunPython(create_projects)]
