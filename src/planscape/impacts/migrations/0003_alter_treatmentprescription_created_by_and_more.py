from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0021_alter_planningareanote_user_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("impacts", "0002_treatmentprescription_treatment_plan"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentprescription",
            name="created_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="created_tx_prescriptions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="project_area",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tx_prescriptions",
                to="planning.projectarea",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="treatment_plan",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tx_prescriptions",
                to="impacts.treatmentplan",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="updated_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="updated_tx_prescriptions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
