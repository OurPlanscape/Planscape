import json
from django.db import migrations, models
from planning.models import ScenarioResultStatus
from django.contrib.gis.geos import GEOSGeometry


def copy_project_areas(apps, schema_editor):
    ProjectArea = apps.get_model("planning", "ProjectArea")
    Scenario = apps.get_model("planning", "Scenario")

    scenarios_without_project_areas = (
        Scenario.objects.annotate(project_area_count=models.Count("project_areas"))
        .filter(
            project_areas_count__lte=0,
            results__status=ScenarioResultStatus.SUCCESS,
        )
        .select_related("results")
    )

    def create_project_areas(scenario):
        geojson = scenario.results.result
        features = geojson.get("features", []) or []
        for f in features:
            properties = f.get("properties")
            geom = GEOSGeometry(json.dumps(f.get("geometry")))
            name = properties.get("proj_id")
            ProjectArea.objects.create(
                created_by=scenario.user,
                created_at=scenario.created_at,
                scenario=scenario,
                name=f"Project Area {name}",
                data=properties,
                geometry=geom,
            )

    for scenario in scenarios_without_project_areas:
        create_project_areas(scenario)


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0022_remove_projectarea_origin_scenario_origin"),
    ]

    operations = []
