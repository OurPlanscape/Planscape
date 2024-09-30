from django.conf import settings
import django.contrib.gis.db.models.fields
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
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
                ("name", models.CharField(max_length=128)),
                ("description", models.TextField(null=True)),
                (
                    "visibility",
                    models.CharField(
                        choices=[("PRIVATE", "Private"), ("PUBLIC", "Public")],
                        default="PRIVATE",
                    ),
                ),
                ("version", models.CharField(null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_datasets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Dataset",
                "verbose_name_plural": "Datasets",
            },
        ),
        migrations.CreateModel(
            name="DataLayer",
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
                ("name", models.CharField(max_length=256)),
                (
                    "type",
                    models.CharField(
                        choices=[("VECTOR", "Vector"), ("RASTER", "Raster")], null=True
                    ),
                ),
                (
                    "geometry_type",
                    models.CharField(
                        choices=[
                            ("NO_GEOM", "No Geometry Field"),
                            ("RASTER", "Raster"),
                            ("POINT", "Point"),
                            ("MULTIPOINT", "MultiPoint"),
                            ("LINESTRING", "LineString"),
                            ("MULTILINESTRING", "MultiLineString"),
                            ("POLYGON", "MultiPolygon"),
                            ("MULTIPOLYGON", "MultiPolygon"),
                        ],
                        null=True,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("READY", "Ready"),
                            ("PENDING", "Pending"),
                            ("FAILED", "Failed"),
                        ],
                        default="PENDING",
                        help_text="Status of the file relative to our system.",
                    ),
                ),
                (
                    "info",
                    models.JSONField(
                        help_text="output of gdalinfo or ogrinfo.", null=True
                    ),
                ),
                (
                    "url",
                    models.CharField(
                        max_length=1024,
                        null=True,
                        validators=[
                            django.core.validators.URLValidator(
                                schemes=["s3", "http", "https", "ftp", "ftps"]
                            )
                        ],
                    ),
                ),
                (
                    "geometry",
                    django.contrib.gis.db.models.fields.PolygonField(
                        help_text="Represents the polygon that encompasses the datalayer. It can be null.",
                        null=True,
                        srid=4269,
                    ),
                ),
                ("metadata", models.JSONField(null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_datalayers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "dataset",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="datalayers",
                        to="datasets.dataset",
                    ),
                ),
            ],
            options={
                "verbose_name": "Datalayer",
                "verbose_name_plural": "Datalayers",
            },
        ),
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
                ("path", models.CharField(max_length=255, unique=True)),
                ("depth", models.PositiveIntegerField()),
                ("numchild", models.PositiveIntegerField(default=0)),
                (
                    "order",
                    models.IntegerField(
                        default=0,
                        help_text="If necessary, changing the order allows the users to configure what categories appears first.",
                    ),
                ),
                ("name", models.CharField(max_length=128)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_categories",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "dataset",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="categories",
                        to="datasets.dataset",
                    ),
                ),
            ],
            options={
                "verbose_name": "Category",
                "verbose_name_plural": "Categories",
            },
        ),
    ]
