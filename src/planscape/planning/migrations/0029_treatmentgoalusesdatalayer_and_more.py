from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0010_alter_style_uuid"),
        ("planning", "0028_treatmentgoal_scenario_treatment_goal"),
    ]

    operations = [
        migrations.CreateModel(
            name="TreatmentGoalUsesDataLayer",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "deleted_at",
                    models.DateTimeField(
                        help_text="Define if the entity has been deleted or not and when",
                        null=True,
                        verbose_name="Deleted at",
                    ),
                ),
                (
                    "usage_type",
                    models.CharField(
                        choices=[
                            ("PRIORITY", "Priority"),
                            ("SECONDARY_METRIC", "Secondary Metric"),
                            ("THRESHOLD", "Threshold"),
                            ("EXCLUSION_ZONE", "Exclusion Zone"),
                        ],
                        help_text="The type of usage for the data layer.",
                        max_length=32,
                    ),
                ),
                (
                    "thresholds",
                    models.JSONField(help_text="Threashold list.", null=True),
                ),
                (
                    "constraints",
                    models.JSONField(
                        help_text="Constraints of the relation between Tx Goal and DataLayer.",
                        null=True,
                    ),
                ),
                (
                    "datalayer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="treatment_goal_data_layers",
                        to="datasets.datalayer",
                    ),
                ),
                (
                    "treatment_goal",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="treatment_goal_data_layers",
                        to="planning.treatmentgoal",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="treatmentgoalusesdatalayer",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at", None)),
                fields=("treatment_goal", "data_layer"),
                name="unique_treatment_goal_data_layer",
            ),
        ),
    ]
