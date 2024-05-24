from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("planning", "0017_userprefs"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectArea",
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
                (
                    "origin",
                    models.CharField(
                        choices=[
                            ("OPTIMIZATION", "Optimization"),
                            ("USER_CREATED", "User Created"),
                        ],
                        default="OPTIMIZATION",
                        help_text="Determines where this project area came from.",
                    ),
                ),
                ("data", models.JSONField(null=True)),
                (
                    "geometry",
                    django.contrib.gis.db.models.fields.MultiPolygonField(srid=4269),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="project_areas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "scenario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="project_areas",
                        to="planning.scenario",
                    ),
                ),
            ],
            options={
                "verbose_name": "Project Area",
                "verbose_name_plural": "Project Areas",
            },
        ),
    ]
