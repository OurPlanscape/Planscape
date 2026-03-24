from django.db import migrations


def populate_stand_size(apps, schema_editor):
    TreatmentPlan = apps.get_model("impacts", "TreatmentPlan")
    for tp in TreatmentPlan.objects.select_related("scenario").iterator():
        config = tp.scenario.configuration or {}
        tp.stand_size = config.get("stand_size") or "LARGE"
        tp.save(update_fields=["stand_size"])


def reverse_stand_size(apps, schema_editor):
    TreatmentPlan = apps.get_model("impacts", "TreatmentPlan")
    TreatmentPlan.objects.all().update(stand_size=None)


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0023_treatmentplan_stand_size"),
    ]

    operations = [
        migrations.RunPython(
            populate_stand_size,
            reverse_stand_size,
        ),
    ]
