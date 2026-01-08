from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0068_strip_geometry_from_scenarioresult"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentgoal",
            name="group",
            field=models.CharField(
                choices=[
                    ("WILDFIRE_RISK_TO_COMMUTIES", "Wildfire Risk to Communities"),
                    ("CALIFORNIA_PLANNING_METRICS", "California Landscape Metrics"),
                    ("TREEMAP_FVS_2020", "TreeMap FVS 2020"),
                    ("PYROLOGIX", "Pyrologix"),
                ],
                help_text="Treatment Goal group.",
                max_length=64,
                null=True,
            ),
        ),
    ]
