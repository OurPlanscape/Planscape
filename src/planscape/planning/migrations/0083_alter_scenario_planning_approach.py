from django.db import migrations, models

BATCH_SIZE = 1000

def backfill_scenarios_planning_approach(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")

    scenarios_queryset = Scenario.objects.filter(planning_approach__isnull=True)
    
    while True:
        scenario_ids_batch = list(
            scenarios_queryset.values_list("id", flat=True)[:BATCH_SIZE]
        )
        if not scenario_ids_batch:
            break

        Scenario.objects.filter(id__in=scenario_ids_batch).update(planning_approach="OPTIMIZE_PROJECT_AREAS")


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0082_alter_planningarea_capabilities_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scenario",
            name="planning_approach",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PRIORITIZE_SUB_UNITS", "Prioritize Sub-Units"),
                    ("OPTIMIZE_PROJECT_AREAS", "Optimize Project Areas"),
                ],
                default="OPTIMIZE_PROJECT_AREAS",
                help_text="Scenario's Planning Approach.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.RunPython(backfill_scenarios_planning_approach, migrations.RunPython.noop),
    ]
