import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0090_alter_treatmentgoal_group"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="treatable_area",
            field=django.contrib.gis.db.models.fields.MultiPolygonField(
                help_text="Geometry of Scenario's treatable area represented by polygons.",
                null=True,
                srid=4269,
            ),
        ),
    ]
