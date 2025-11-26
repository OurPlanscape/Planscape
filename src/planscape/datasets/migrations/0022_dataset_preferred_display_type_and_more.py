from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0021_alter_datalayer_styles"),
    ]

    operations = [
        migrations.AddField(
            model_name="dataset",
            name="preferred_display_type",
            field=models.CharField(
                choices=[
                    ("MAIN_DATALAYERS", "Main DataLayers"),
                    ("BASE_DATALAYERS", "Base DataLayers"),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="dataset",
            name="selection_type",
            field=models.CharField(
                choices=[("SINGLE", "Single"), ("MULTIPLE", "Multiple")],
                max_length=32,
                null=True,
            ),
        ),
    ]
