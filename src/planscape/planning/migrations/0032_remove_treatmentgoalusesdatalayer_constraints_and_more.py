from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "planning",
            "0031_remove_treatmentgoalusesdatalayer_unique_treatment_goal_datalayer_and_more",
        ),
    ]

    operations = [
        migrations.RemoveField(
            model_name="treatmentgoalusesdatalayer",
            name="constraints",
        ),
        migrations.RemoveField(
            model_name="treatmentgoalusesdatalayer",
            name="thresholds",
        ),
        migrations.AddField(
            model_name="treatmentgoalusesdatalayer",
            name="threshold",
            field=models.CharField(
                help_text="Threshold for the data layer.", max_length=256, null=True
            ),
        ),
    ]
