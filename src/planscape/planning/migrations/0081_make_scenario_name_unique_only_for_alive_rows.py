from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0080_update_priority_objective_weights_3131_3132"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="scenario",
            name="unique_scenario",
        ),
        migrations.AddConstraint(
            model_name="scenario",
            constraint=models.UniqueConstraint(
                condition=Q(deleted_at=None),
                fields=("planning_area", "name"),
                name="unique_scenario",
            ),
        ),
    ]
