from django.db import migrations, models


def set_stands_done(apps, schema_editor):
    from planning.models import PlanningAreaMapStatus

    PlanningArea = apps.get_model("planning", "PlanningArea")
    PlanningArea.objects.update(map_status=PlanningAreaMapStatus.STANDS_DONE)


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0055_backfill_scenario_capabilities"),
    ]

    operations = [
        migrations.AlterField(
            model_name="planningarea",
            name="map_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("IN_PROGRESS", "In Progress"),
                    ("STANDS_DONE", "Stands Done"),
                    ("DONE", "Done"),
                    ("FAILED", "Failed"),
                ],
                help_text="Controls the status of all the processes needed to allow the dynamic map to work.",
                null=True,
            ),
        ),
        migrations.RunPython(set_stands_done, migrations.RunPython.noop),
    ]
