import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dataset",
            name="geometry",
            field=django.contrib.gis.db.models.fields.PolygonField(
                help_text="Bounding Box of the dataset", null=True, srid=4269
            ),
        ),
    ]
