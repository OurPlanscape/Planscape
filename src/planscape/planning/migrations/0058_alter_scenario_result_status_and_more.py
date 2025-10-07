from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0057_planningarea_metrics_ready_at_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scenario",
            name="result_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Success"),
                    ("FAILURE", "Failure"),
                    ("PANIC", "Panic"),
                    ("TIMED_OUT", "Timed Out"),
                    ("DRAFT", "Draft"),
                ],
                help_text="Result status of the Scenario.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="scenarioresult",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Success"),
                    ("FAILURE", "Failure"),
                    ("PANIC", "Panic"),
                    ("TIMED_OUT", "Timed Out"),
                    ("DRAFT", "Draft"),
                ],
                default="PENDING",
                max_length=16,
            ),
        ),
    ]
