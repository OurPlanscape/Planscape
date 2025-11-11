from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0021_alter_datalayer_styles"),
        ("planning", "0061_rebin_conus_goals_timber_crown_mortality"),
    ]

    operations = [
        migrations.AddField(
            model_name="planningarea",
            name="scenario_count",
            field=models.IntegerField(null=True),
        ),
        migrations.AlterField(
            model_name="treatmentgoal",
            name="datalayers",
            field=models.ManyToManyField(
                through="planning.TreatmentGoalUsesDataLayer",
                through_fields=("treatment_goal", "datalayer"),
                to="datasets.datalayer",
            ),
        ),
    ]
