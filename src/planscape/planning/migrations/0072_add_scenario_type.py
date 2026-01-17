from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0071_add_risk_based_strategic_treatment_goals"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="type",
            field=models.CharField(
                choices=[("PRESET", "Preset"), ("CUSTOM", "Custom")],
                help_text="Scenario type.",
                max_length=16,
                null=True,
                blank=True,
            ),
        ),
    ]
