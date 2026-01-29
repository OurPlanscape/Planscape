from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0077_backfill_scenario_type_preset"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoalusesdatalayer",
            name="weight",
            field=models.PositiveIntegerField(
                null=True,
                validators=[MinValueValidator(1)],
                help_text="Only applies when Usage Type = PRIORITY. Must be a positive integer (>= 1).",
            ),
        ),
    ]
