from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0086_new_TG_reduce_wildfire_transmission_to_housing"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="post_process_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Success"),
                    ("FAILURE", "Failure"),
                ],
                default="PENDING",
                help_text="Result status of the Scenario.",
                max_length=32,
                null=True,
            ),
        ),
    ]
