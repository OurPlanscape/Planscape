from django.conf import settings
import django.contrib.gis.db.models.fields
import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0004_alter_organization_owner"),
    ]

    operations = [
        migrations.CreateModel(
            name="Dataset",
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
                ("name", models.CharField(max_length=256)),
                (
                    "type",
                    models.CharField(
                        choices=[("VECTOR", "Vector"), ("RASTER", "Raster")]
                    ),
                ),
                (
                    "blob_status",
                    models.CharField(
                        choices=[
                            ("FAILED", "Failed"),
                            ("PENDING_UPLOAD", "Pending Upload"),
                            ("READY", "Ready"),
                        ],
                        default="PENDING_UPLOAD",
                    ),
                ),
                (
                    "info",
                    models.JSONField(
                        help_text="Contains the result of ogrinfo or gdalinfo in this dataset. This has important information on how the dataset behaves. Can only be obtained after the dataset is in storage.",
                        null=True,
                    ),
                ),
                (
                    "url",
                    models.URLField(
                        help_text="URL of the dataset in storage. Most like an s3 url.",
                        max_length=512,
                    ),
                ),
                (
                    "geometry",
                    django.contrib.gis.db.models.fields.PolygonField(
                        help_text="Bounding Box of the dataset", srid=4269
                    ),
                ),
                (
                    "operations",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=64),
                        help_text="List of the operations this dataset passed through. Operations at the head of the list were applied last.",
                        null=True,
                        size=None,
                    ),
                ),
                ("data_units", models.CharField(max_length=128, null=True)),
                ("provider", models.CharField(max_length=256, null=True)),
                ("source", models.CharField(max_length=256, null=True)),
                ("source_url", models.URLField(max_length=512, null=True)),
                ("reference_url", models.URLField(max_length=512, null=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="datasets",
                        to="organizations.organization",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="owned_datasets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Dataset",
                "verbose_name_plural": "Datasets",
            },
        ),
    ]
