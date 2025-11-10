from django.db import migrations


def handle(apps, schema_editor):
    PlanningArea = apps.get_model("planning", "PlanningArea")
    for pa in PlanningArea.objects.dead_or_alive():
        pa.scenario_count = pa.scenarios.all().count()
        pa.save(update_fields=["updated_at", "scenario_count"])


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0062_planningarea_scenario_count_and_more"),
    ]

    operations = [
        migrations.RunPython(handle, migrations.RunPython.noop),
    ]
