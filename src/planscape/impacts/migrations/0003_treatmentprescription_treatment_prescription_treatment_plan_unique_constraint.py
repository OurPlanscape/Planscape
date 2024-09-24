from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0002_treatmentprescription_treatment_plan"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="treatmentprescription",
            constraint=models.UniqueConstraint(
                fields=("treatment_plan", "stand"),
                include=("type", "action"),
                name="treatment_prescription_treatment_plan_unique_constraint",
            ),
        ),
    ]
