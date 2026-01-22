from django.db import migrations


BATCH_SIZE = 1000


def backfill_scenario_type_preset(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")

    scenarios_queryset = Scenario.objects.filter(type__isnull=True)

    while True:
        scenario_ids_batch = list(
            scenarios_queryset.values_list("id", flat=True)[:BATCH_SIZE]
        )
        if not scenario_ids_batch:
            break

        Scenario.objects.filter(id__in=scenario_ids_batch).update(type="PRESET")


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0076_add_tg_treemap_fvs_2020_high_volume_high_wildfire_"),
    ]

    operations = [
        migrations.RunPython(backfill_scenario_type_preset, migrations.RunPython.noop),
    ]
