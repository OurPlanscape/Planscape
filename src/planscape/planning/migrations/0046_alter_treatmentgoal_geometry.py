import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0045_auto_20250811_1507"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentgoal",
            name="geometry",
            field=django.contrib.gis.db.models.fields.MultiPolygonField(
                help_text="Stores the bounding box that represents the union of all available layers. all planning areas must be inside this polygon.",
                null=True,
                srid=4269,
            ),
        ),
    ]
