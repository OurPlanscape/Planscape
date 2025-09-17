from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0051_planningarea_map_status"),
    ]

    operations = [
        migrations.AlterField(
            model_name="planningarea",
            name="map_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("IN_PROGRESS", "In Progress"),
                    ("DONE", "Done"),
                    ("FAILED", "Failed"),
                ],
                help_text="Controls the status of all the processes needed to allow the dynamic map to work.",
                null=True,
            ),
        ),
    ]
