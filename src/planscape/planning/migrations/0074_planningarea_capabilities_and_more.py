import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0073_backfill_scenario_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="planningarea",
            name="capabilities",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("FORSYS", "Forsys"),
                        ("IMPACTS", "Impacts"),
                        ("MAP", "Map"),
                        ("CLIMATE_FORESIGHT", "Climate Foresight"),
                    ],
                    max_length=32,
                ),
                blank=True,
                default=list,
                help_text="List of enabled capabilities for this Planning Area.",
                size=None,
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="capabilities",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("FORSYS", "Forsys"),
                        ("IMPACTS", "Impacts"),
                        ("MAP", "Map"),
                        ("CLIMATE_FORESIGHT", "Climate Foresight"),
                    ],
                    max_length=32,
                ),
                blank=True,
                default=list,
                help_text="List of enabled capabilities for this Scenario.",
                size=None,
            ),
        ),
    ]
