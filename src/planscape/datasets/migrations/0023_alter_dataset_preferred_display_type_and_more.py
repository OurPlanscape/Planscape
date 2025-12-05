from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0022_dataset_preferred_display_type_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dataset",
            name="preferred_display_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MAIN_DATALAYERS", "Main DataLayers"),
                    ("BASE_DATALAYERS", "Base DataLayers"),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="dataset",
            name="selection_type",
            field=models.CharField(
                blank=True,
                choices=[("SINGLE", "Single"), ("MULTIPLE", "Multiple")],
                max_length=32,
                null=True,
            ),
        ),
    ]
