from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0004_alter_organization_options"),
        ("datasets", "0007_datalayer_datalayer_unique_constraint"),
    ]

    operations = [
        migrations.CreateModel(
            name="Style",
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
                ("uuid", models.UUIDField(null=True)),
                ("name", models.CharField(max_length=128)),
                (
                    "type",
                    models.CharField(
                        choices=[("VECTOR", "Vector"), ("RASTER", "Raster")],
                        default="RASTER",
                    ),
                ),
                ("data", models.JSONField()),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_styles",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="styles",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "verbose_name": "Style",
                "verbose_name_plural": "Styles",
                "ordering": ("organization", "id"),
            },
        ),
        migrations.CreateModel(
            name="DataLayerHasStyle",
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
                ("default", models.BooleanField(default=True)),
                (
                    "datalayer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rel_styles",
                        to="datasets.datalayer",
                    ),
                ),
                (
                    "style",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rel_styles",
                        to="datasets.style",
                    ),
                ),
            ],
            options={
                "verbose_name": "DataLayer has Style",
                "verbose_name_plural": "DataLayer Has Styles",
                "ordering": ("datalayer", "style"),
            },
        ),
        migrations.AddField(
            model_name="datalayer",
            name="styles",
            field=models.ManyToManyField(
                through="datasets.DataLayerHasStyle", to="datasets.style"
            ),
        ),
        migrations.AddConstraint(
            model_name="style",
            constraint=models.UniqueConstraint(
                fields=("organization", "name", "type"), name="style_unique_constraint"
            ),
        ),
        migrations.AddConstraint(
            model_name="datalayerhasstyle",
            constraint=models.UniqueConstraint(
                fields=("datalayer", "style"),
                name="datalayerhasstyle_unique_constraint",
            ),
        ),
    ]
