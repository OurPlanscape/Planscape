from django.conf import settings
import django.contrib.gis.db.models.fields
import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion
import projects.models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0002_auto_20240425_1716"),
    ]

    operations = [
        migrations.CreateModel(
            name="Project",
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
                ("name", models.CharField(max_length=128)),
                ("display_name", models.CharField(max_length=128, null=True)),
                (
                    "visibility",
                    models.CharField(
                        choices=[("PUBLIC", "Public"), ("PRIVATE", "Private")],
                        default="PRIVATE",
                        help_text="Visibility choice to control project visibility to external clients",
                        max_length=64,
                    ),
                ),
                (
                    "capabilities",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[("EXPLORE", "Explore"), ("PLAN", "Plan")],
                            max_length=64,
                        ),
                        default=projects.models.default_capabilities,
                        help_text="Models our per project feature flags",
                        size=None,
                    ),
                ),
                (
                    "geometry",
                    django.contrib.gis.db.models.fields.MultiPolygonField(srid=4269),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "verbose_name": "Project",
                "verbose_name_plural": "Projects",
            },
        ),
    ]
