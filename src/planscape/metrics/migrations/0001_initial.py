from django.conf import settings
import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion
import metrics.models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("datasets", "0001_initial"),
        ("projects", "0003_auto_20240506_1920"),
        ("organizations", "0004_alter_organization_owner"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
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
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="categories",
                        to="organizations.organization",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="owned_categories",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="categories",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "verbose_name": "Category",
                "verbose_name_plural": "Categories",
            },
        ),
        migrations.CreateModel(
            name="Metric",
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
                ("name", models.CharField(max_length=128)),
                ("display_name", models.CharField(max_length=128)),
                (
                    "capabilities",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("MAP_VIEW", "Map View"),
                                ("OPTIMIZATION", "Optimization"),
                            ]
                        ),
                        default=metrics.models.get_default_metric_capabilities,
                        size=None,
                    ),
                ),
                (
                    "category",
                    models.ForeignKey(
                        help_text="category that this metric belongs to. e.g. Air Quality/Particulate Matter",
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="metrics",
                        to="metrics.category",
                    ),
                ),
                (
                    "dataset",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="metrics",
                        to="datasets.dataset",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="owned_metrics",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="metrics",
                        to="projects.project",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="metric",
            constraint=models.UniqueConstraint(
                fields=("project", "name"), name="metric_project_unique_constraint"
            ),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("organization", "project", "name"),
                include=("path",),
                name="category_organization_project_unique_constraint",
            ),
        ),
    ]
