from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "impacts",
            "0019_remove_projectareatreatmentresult_project_area_treatment_result_unique_constraint_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentplan",
            name="finished_at",
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name="treatmentplan",
            name="started_at",
            field=models.DateTimeField(null=True),
        ),
    ]
