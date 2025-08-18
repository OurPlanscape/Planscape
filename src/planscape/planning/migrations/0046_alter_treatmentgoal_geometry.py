import django.contrib.gis.db.models.fields
from django.db import migrations


def noop(apps, schema_editor):
    pass


def set_none(apps, schema_editor):
    from planning.models import TreatmentGoal

    TreatmentGoal.objects.update(geometry=None)


def set_geometry(apps, schema_editor):
    from planning.models import TreatmentGoal

    for t in TreatmentGoal.objects.filter(active=True):
        t.geometry = t.get_coverage()
        t.save()


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0045_auto_20250811_1507"),
    ]

    operations = [
        migrations.RunPython(set_none, noop),
        migrations.AlterField(
            model_name="treatmentgoal",
            name="geometry",
            field=django.contrib.gis.db.models.fields.MultiPolygonField(
                help_text="Stores the bounding box that represents the union of all available layers. all planning areas must be inside this polygon.",
                null=True,
                srid=4269,
            ),
        ),
        migrations.RunPython(set_geometry, noop),
    ]
