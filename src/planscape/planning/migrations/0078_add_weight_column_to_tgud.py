from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0077_backfill_scenario_type_preset"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoalusesdatalayer",
            name="weight",
            field=models.FloatField(
                default=1.0,
                help_text="Weight for PRIORITY usage type (relative importance)",
            ),
        ),
    ]
