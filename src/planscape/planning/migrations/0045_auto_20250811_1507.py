from django.db import migrations


def forward(apps, schema_editor):
    from planning.models import TreatmentGoal

    for t in TreatmentGoal.objects.all():
        t.geometry = t.datalayers.all().geometric_intersection()  # type: ignore
        t.save()


def backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0044_add_secondary_metrics"),
    ]

    operations = [migrations.RunPython(forward, backward)]
