from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "planning",
            "0024_alter_planningarea_geometry_alter_planningarea_name_and_more",
        ),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="planningarea",
            name="unique_planning_area",
        ),
        migrations.AddConstraint(
            model_name="planningarea",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at", None)),
                fields=("user", "region_name", "name"),
                name="unique_planning_area",
            ),
        ),
    ]
