from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0088_remove_planning_area_scenario_count"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentgoal",
            name="group",
            field=models.CharField(
                choices=[
                    ("CALIFORNIA_PLANNING_METRICS", "California Landscape Metrics"),
                    ("CLIMATE_FORESIGHT_DEMO", "Climate Foresight Demo"),
                    ("PYROLOGIX", "Pyrologix"),
                    ("RISK_BASED_STRATEGIC_PLANNING", "Risk-Based Strategic Planning"),
                    ("TREEMAP_FVS_2020", "TreeMap FVS 2020"),
                    ("INYO_PLANNING", "Inyo Planning"),
                    ("WILDFIRE_RISK_TO_COMMUTIES", "Wildfire Risk to Communities"),
                ],
                help_text="Treatment Goal group.",
                max_length=64,
                null=True,
            ),
        ),
    ]
