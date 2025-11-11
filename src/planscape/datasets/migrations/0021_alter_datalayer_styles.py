from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0020_auto_20250829_1648"),
    ]

    operations = [
        migrations.AlterField(
            model_name="datalayer",
            name="styles",
            field=models.ManyToManyField(
                through="datasets.DataLayerHasStyle",
                through_fields=("datalayer", "style"),
                to="datasets.style",
            ),
        ),
    ]
