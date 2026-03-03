import django.contrib.postgres.fields
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0081_make_scenario_name_unique_only_for_alive_rows"),
    ]

    operations = [
        migrations.AlterField(
            model_name="planningarea",
            name="capabilities",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("FORSYS", "Forsys"),
                        ("IMPACTS", "Impacts"),
                        ("MAP", "Map"),
                        ("CLIMATE_FORESIGHT", "Climate Foresight"),
                        ("PRIORITIZE_SUB_UNITS", "Prioritize Sub-Units"),
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
                        ("PRIORITIZE_SUB_UNITS", "Prioritize Sub-Units"),
                    ],
                    max_length=32,
                ),
                blank=True,
                default=list,
                help_text="List of enabled capabilities for this Scenario.",
                size=None,
            ),
        ),
        migrations.AlterField(
            model_name="treatmentgoalusesdatalayer",
            name="weight",
            field=models.PositiveIntegerField(
                help_text="Only applies when Usage Type = PRIORITY. Must be a positive integer (>= 1).",
                null=True,
                validators=[django.core.validators.MinValueValidator(1)],
            ),
        ),
    ]
