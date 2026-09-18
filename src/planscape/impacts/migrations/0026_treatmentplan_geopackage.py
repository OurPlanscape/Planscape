from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0025_treatmentplan_stand_size_not_null"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentplan",
            name="geopackage_status",
            field=models.CharField(
                choices=[
                    ("SUCCEEDED", "Succeeded"),
                    ("PROCESSING", "Processing"),
                    ("PENDING", "Pending"),
                    ("FAILED", "Failed"),
                ],
                help_text="Result status of the generation of a geopackage.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="treatmentplan",
            name="geopackage_url",
            field=models.URLField(
                help_text="Geopackage URL of the Treatment Plan.",
                null=True,
            ),
        ),
    ]
