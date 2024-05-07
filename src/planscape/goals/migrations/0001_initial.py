from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import goals.models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("metrics", "0002_metric_created_at_metric_deleted_at_and_more"),
        ("projects", "0003_alter_project_created_by_alter_project_organization"),
    ]

    operations = [
        migrations.CreateModel(
            name="MetricUsage",
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
                (
                    "type",
                    models.CharField(
                        choices=[("PRIORITY", "Priority"), ("REPORTING", "Reporting")],
                        default="PRIORITY",
                        max_length=64,
                    ),
                ),
                (
                    "attribute",
                    models.CharField(
                        choices=[
                            ("min", "Min"),
                            ("max", "Max"),
                            ("mean", "Mean"),
                            ("sum", "Sum"),
                            ("majority", "Majority"),
                            ("minority", "Minority"),
                            ("count", "COUNT"),
                        ],
                        default="mean",
                        max_length=64,
                    ),
                ),
                (
                    "post_processing",
                    models.CharField(
                        choices=[
                            ("NONE", "None"),
                            ("PROJECT_AVERAGE", "Project Average"),
                            ("PROJECT_AREA_SUM", "Project Area Sum"),
                            (
                                "PROJECT_AVERAGE_WITH_CATEGORIES",
                                "Project Average with Categories",
                            ),
                        ],
                        default="PROJECT_AVERAGE",
                        max_length=64,
                    ),
                ),
                (
                    "metric",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="metric_usages",
                        to="metrics.metric",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="TreatmentGoalCategory",
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
                ("uuid", models.UUIDField(db_index=True, default=uuid.uuid4)),
                ("depth", models.PositiveIntegerField()),
                ("numchild", models.PositiveIntegerField(default=0)),
                ("name", models.CharField(max_length=128)),
                ("path", models.CharField(max_length=512)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_treatment_goal_categories",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="treatment_goal_categories",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "verbose_name": "Treatment Goal Category",
                "verbose_name_plural": "Treatment Goal Categories",
            },
        ),
        migrations.CreateModel(
            name="TreatmentGoal",
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
                ("uuid", models.UUIDField(db_index=True, default=uuid.uuid4)),
                (
                    "name",
                    models.CharField(
                        help_text="Name of the treatment goal. Equivalent to short_question_text.",
                        max_length=128,
                    ),
                ),
                (
                    "long_question_text",
                    models.CharField(
                        help_text="this is a legacy field required to keep compatibility. most likely will be deprecated soon.",
                        max_length=512,
                        null=True,
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        help_text="This field should contain the help text displayed as the box on the right, after you select the treatment goal.",
                        null=True,
                    ),
                ),
                (
                    "executor",
                    models.CharField(
                        choices=[("FORSYS", "ForSys")], default="FORSYS", max_length=64
                    ),
                ),
                (
                    "execution_options",
                    models.JSONField(
                        default=goals.models.get_forsys_defaults,
                        help_text="Stores a map of downstream configurations to be passed to the executor. Right now only FORSYS is our executor.",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_treatment_goals",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "metrics",
                    models.ManyToManyField(
                        related_name="treatment_goals",
                        through="goals.MetricUsage",
                        to="metrics.metric",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="treatment_goals",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.AddField(
            model_name="metricusage",
            name="treatment_goal",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="metric_usages",
                to="goals.treatmentgoal",
            ),
        ),
        migrations.AddConstraint(
            model_name="treatmentgoalcategory",
            constraint=models.UniqueConstraint(
                fields=("project", "name"),
                include=("path",),
                name="treatment_goal_category_project_unique_constraint",
            ),
        ),
        migrations.AddConstraint(
            model_name="metricusage",
            constraint=models.UniqueConstraint(
                fields=("treatment_goal", "metric"),
                name="metric_usage_unique_constraint",
            ),
        ),
    ]
