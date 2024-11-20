from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0014_projectareatreatmentresult_delta"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="treatmentresult",
            name="treatment_result_unique_constraint",
        ),
        migrations.AddConstraint(
            model_name="treatmentresult",
            constraint=models.UniqueConstraint(
                fields=("treatment_plan", "stand", "variable", "year", "aggregation"),
                name="treatment_result_unique_constraint",
            ),
        ),
    ]
