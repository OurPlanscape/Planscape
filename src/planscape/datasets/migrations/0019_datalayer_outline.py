import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0018_alter_datalayer_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="outline",
            field=django.contrib.gis.db.models.fields.MultiPolygonField(
                help_text="Represents the detailed geometry of the layer. Only shows where there is data at the time of upload",
                null=True,
                srid=4269,
            ),
        ),
    ]
