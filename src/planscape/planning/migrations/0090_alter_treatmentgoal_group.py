from django.db import migrations, models


def fix_wildfire_risk_to_communities_typo(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")

    TreatmentGoal.objects.filter(group="WILDFIRE_RISK_TO_COMMUTIES").update(group="WILDFIRE_RISK_TO_COMMUNITIES")



class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0089_add_west_mono_basin_resilience_treatment_goal_group"),
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
                    ("WILDFIRE_RISK_TO_COMMUNITIES", "Wildfire Risk to Communities"),
                ],
                help_text="Treatment Goal group.",
                max_length=64,
                null=True,
            ),
        ),
        migrations.RunPython(fix_wildfire_risk_to_communities_typo, migrations.RunPython.noop),
    ]
