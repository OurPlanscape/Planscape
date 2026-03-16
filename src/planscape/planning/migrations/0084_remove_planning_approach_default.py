from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0083_alter_scenario_planning_approach"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scenario",
            name="planning_approach",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PRIORITIZE_SUB_UNITS", "Prioritize Sub-Units"),
                    ("OPTIMIZE_PROJECT_AREAS", "Optimize Project Areas"),
                ],
                help_text="Scenario's Planning Approach.",
                max_length=32,
                null=True,
            ),
        ),
    ]
