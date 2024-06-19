from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentprescription",
            name="treatment_plan",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="tx_prescriptions",
                to="impacts.treatmentplan",
            ),
        ),
    ]
