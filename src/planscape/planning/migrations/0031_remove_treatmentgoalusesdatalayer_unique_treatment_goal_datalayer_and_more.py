from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0030_treatmentgoal_category_treatmentgoal_created_by"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="treatmentgoalusesdatalayer",
            name="unique_treatment_goal_datalayer",
        ),
        migrations.AddConstraint(
            model_name="treatmentgoalusesdatalayer",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at", None)),
                fields=("treatment_goal", "datalayer", "usage_type"),
                name="unique_treatment_goal_datalayer_usage_type",
            ),
        ),
    ]
