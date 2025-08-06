import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0038_alter_planningarea_region_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoal",
            name="geometry",
            field=django.contrib.gis.db.models.fields.PolygonField(
                help_text="Stores the bounding box that represents the union of all available layers. all planning areas must be inside this polygon.",
                null=True,
                srid=4269,
            ),
        ),
    ]
