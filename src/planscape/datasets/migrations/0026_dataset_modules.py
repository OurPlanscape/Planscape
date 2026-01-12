import datasets.models
import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0025_auto_20251215_1835"),
    ]

    operations = [
        migrations.AddField(
            model_name="dataset",
            name="modules",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=32),
                blank=True,
                help_text="List of modules this dataset is associated with.",
                null=True,
                size=None,
                validators=[datasets.models.validate_dataset_modules],
            ),
        ),
    ]
