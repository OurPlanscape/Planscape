from django.db import migrations


BATCH_SIZE = 1000


def backfill_scenario_type(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")

    scenarios_queryset = Scenario.objects.filter(
        type__isnull=True,
        treatment_goal__isnull=False,
    )

    while True:
        scenario_ids_batch = list(
            scenarios_queryset.values_list("id", flat=True)[:BATCH_SIZE]
        )
        if not scenario_ids_batch:
            break

        Scenario.objects.filter(id__in=scenario_ids_batch).update(type="PRESET")


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0072_add_scenario_type"),
    ]

    operations = [
        migrations.RunPython(backfill_scenario_type, migrations.RunPython.noop),
    ]
