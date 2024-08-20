from django.db import migrations, models


def set_origin(apps, schema_editor):
    from planning.models import ScenarioOrigin

    Scenario = apps.get_model("planning", "Scenario")
    Scenario.objects.all().update(origin=ScenarioOrigin.OPTIMIZATION)


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0021_planningarea_deleted_at_scenario_deleted_at_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="projectarea",
            name="origin",
        ),
        migrations.AddField(
            model_name="scenario",
            name="origin",
            field=models.CharField(
                choices=[
                    ("OPTIMIZATION", "Optimization"),
                    ("USER_CREATED", "User Created"),
                ],
                null=True,
            ),
        ),
        migrations.RunPython(set_origin),
    ]
