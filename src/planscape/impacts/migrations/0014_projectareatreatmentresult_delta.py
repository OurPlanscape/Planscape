from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "impacts",
            "0013_remove_treatmentresult_treatment_result_unique_constraint_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="projectareatreatmentresult",
            name="delta",
            field=models.FloatField(null=True),
        ),
    ]
