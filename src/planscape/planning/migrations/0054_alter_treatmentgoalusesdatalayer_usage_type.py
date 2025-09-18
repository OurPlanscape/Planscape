from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0053_change_scenario_capabilities_to_array"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentgoalusesdatalayer",
            name="usage_type",
            field=models.CharField(
                choices=[
                    ("PRIORITY", "Priority"),
                    ("SECONDARY_METRIC", "Secondary Metric"),
                    ("THRESHOLD", "Threshold"),
                    ("EXCLUSION_ZONE", "Exclusion Zone"),
                    ("INCLUSION_ZONE", "Inclusion Zone"),
                ],
                help_text="The type of usage for the data layer.",
                max_length=32,
            ),
        ),
    ]
