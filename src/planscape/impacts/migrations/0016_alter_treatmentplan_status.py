from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "impacts",
            "0015_remove_treatmentresult_treatment_result_unique_constraint_and_more",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentplan",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("QUEUED", "Queued"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Suceess"),
                    ("FAILURE", "Failure"),
                ],
                default="PENDING",
                help_text="Status of Treatment Plan (choice).",
            ),
        ),
    ]
