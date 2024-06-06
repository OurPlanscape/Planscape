from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0019_projectarea_scenario_name_unique_constraint"),
    ]

    operations = [
        migrations.AddField(
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
                ],
                max_length=32,
                null=True,
            ),
        ),
    ]
