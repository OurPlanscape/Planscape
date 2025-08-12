from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0042_scenario_geopackage_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
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
    ]
