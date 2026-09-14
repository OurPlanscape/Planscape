import django.contrib.gis.db.models.fields
from django.db import migrations


def noop(apps, schema_editor):
    pass


def set_none(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")

    TreatmentGoal.objects.update(geometry=None)


def set_geometry(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")

    for t in TreatmentGoal.objects.filter(active=True):
        active_datalayers = t.datalayers.filter(
            used_by_treatment_goals__deleted_at__isnull=True
        )
        t.geometry = active_datalayers.geometric_intersection(geometry_field="outline")
        t.save(update_fields=["geometry"])


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
