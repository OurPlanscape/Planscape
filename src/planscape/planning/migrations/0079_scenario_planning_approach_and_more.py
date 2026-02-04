import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0078_add_weight_column_to_tgud"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="planning_approach",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PRIOR_SUB_UNITS", "Prioritize Sub-Units"),
                    ("OPTMIZE_PROJECT_AREAS", "Optmize Project Areas"),
                ],
                help_text="Scenario's Planning Approach.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="treatmentgoalusesdatalayer",
            name="weight",
            field=models.FloatField(
                help_text="Only applies when Usage Type = PRIORITY. Must be a positive integer (>= 1).",
                null=True,
                validators=[django.core.validators.MinValueValidator(1)],
            ),
        ),
    ]
