import django.db.models.deletion
from django.db import migrations, models


def backfill_project_area_scenarios(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    ProjectArea = apps.get_model("planning", "ProjectArea")

    scenario_ids = (
        ProjectArea.objects.filter(scenario__origin="USER")
        .values_list("scenario_id", flat=True)
        .distinct()
    )

    Scenario.objects.filter(pk__in=scenario_ids).update(type="PROJECT_AREAS")


def reverse_backfill_project_area_scenarios(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    Scenario.objects.filter(type="PROJECT_AREAS").update(type=None)


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0091_scenario_treatable_area"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                help_text="Parent Scenario for child Prioritization Scenarios.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="children",
                to="planning.scenario",
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PRESET", "Preset"),
                    ("CUSTOM", "Custom"),
                    ("PROJECT_AREAS", "Project Areas"),
                ],
                help_text="Scenario type.",
                max_length=16,
                null=True,
            ),
        ),
        migrations.RunPython(
            backfill_project_area_scenarios,
            reverse_backfill_project_area_scenarios,
        ),
    ]
