from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0039_treatmentgoal_geometry"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoal",
            name="group",
            field=models.CharField(
                choices=[
                    ("WILDFIRE_RISK_TO_COMMUTIES", "Wildfire Risk to Communities"),
                    ("CALIFORNIA_PLANNING_METRICS", "California Planning Metrics"),
                ],
                help_text="Treatment Goal group.",
                max_length=64,
                null=True,
            ),
        ),
    ]
