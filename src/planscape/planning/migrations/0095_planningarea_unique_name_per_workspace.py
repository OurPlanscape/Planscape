from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0094_scenarioresult_errors"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="planningarea",
            name="unique_planning_area",
        ),
        migrations.AddConstraint(
            model_name="planningarea",
            constraint=models.UniqueConstraint(
                condition=Q(deleted_at=None),
                fields=("workspace", "name"),
                name="unique_planning_area",
            ),
        ),
    ]
