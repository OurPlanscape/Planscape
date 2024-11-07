from typing import Optional
from django.contrib.auth import get_user_model
from django.core.validators import URLValidator
from django.conf import settings
from django.contrib.gis.db import models
from django_stubs_ext.db.models import TypedModelMeta
from treebeard.mp_tree import MP_Node

from core.models import CreatedAtMixin, DeletedAtMixin, UpdatedAtMixin
from core.s3 import create_download_url
from core.schemes import SUPPORTED_SCHEMES
from organizations.models import Organization

User = get_user_model()


class VisibilityOptions(models.TextChoices):
    PRIVATE = "PRIVATE", "Private"
    PUBLIC = "PUBLIC", "Public"


class Dataset(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="created_datasets",
        on_delete=models.RESTRICT,
    )

    organization_id: int
    organization = models.ForeignKey(
        Organization,
        related_name="datasets",
        on_delete=models.RESTRICT,
        null=True,
    )

    name = models.CharField(max_length=128)
    description = models.TextField(
        null=True,
    )
    visibility = models.CharField(
        choices=VisibilityOptions.choices,
        default=VisibilityOptions.PRIVATE,
    )
    version = models.CharField(
        null=True,
    )

    def __str__(self) -> str:
        return f"{self.name} [{self.organization}] "

    class Meta(TypedModelMeta):
        verbose_name = "Dataset"
        verbose_name_plural = "Datasets"


class Category(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, MP_Node):
    id: int

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="created_categories",
        on_delete=models.RESTRICT,
    )

    organization_id: int
    organization = models.ForeignKey(
        Organization,
        related_name="categories",
        on_delete=models.RESTRICT,
        null=True,
    )

    dataset_id: int
    dataset = models.ForeignKey(
        Dataset,
        related_name="categories",
        on_delete=models.RESTRICT,
    )

    order = models.IntegerField(
        default=0,
        help_text="If necessary, changing the order allows the users to configure what categories appears first.",
        null=True,
    )

    node_order_by = [
        "order",
        "name",
    ]

    name = models.CharField(
        max_length=128,
    )

    def __str__(self) -> str:
        return self.name

    class Meta(TypedModelMeta):
        verbose_name = "Category"
        verbose_name_plural = "Categories"


class DataLayerType(models.TextChoices):
    VECTOR = "VECTOR", "Vector"
    RASTER = "RASTER", "Raster"


class DataLayerStatus(models.TextChoices):
    READY = "READY", "Ready"
    PENDING = "PENDING", "Pending"
    FAILED = "FAILED", "Failed"


class GeometryType(models.TextChoices):
    NO_GEOM = "NO_GEOM", "No Geometry Field"
    RASTER = "RASTER", "Raster"
    POINT = "POINT", "Point"
    MULTIPOINT = "MULTIPOINT", "MultiPoint"
    LINESTRING = "LINESTRING", "LineString"
    MULTILINESTRING = "MULTILINESTRING", "MultiLineString"
    POLYGON = "POLYGON", "Polygon"
    MULTIPOLYGON = "MULTIPOLYGON", "MultiPolygon"


class DataLayerManager(models.Manager):
    def by_module(self, module: str) -> "QuerySet[DataLayer]":
        return self.get_queryset().filter(metadata__modules__has_key=module)


class DataLayer(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int

    uuid = models.UUIDField(
        null=True,
    )

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="created_datalayers",
        on_delete=models.RESTRICT,
    )

    organization_id: int
    organization = models.ForeignKey(
        Organization,
        related_name="datalayers",
        on_delete=models.RESTRICT,
        null=True,
    )

    dataset_id: int
    dataset = models.ForeignKey(
        Dataset,
        related_name="datalayers",
        on_delete=models.RESTRICT,
    )

    category_id: int
    category = models.ForeignKey(
        Category,
        related_name="datalayers",
        on_delete=models.RESTRICT,
        null=True,
    )

    name = models.CharField(max_length=256)

    type = models.CharField(
        choices=DataLayerType.choices,
        null=True,
    )

    geometry_type = models.CharField(
        choices=GeometryType.choices,
        null=True,
    )

    status = models.CharField(
        choices=DataLayerStatus.choices,
        default=DataLayerStatus.PENDING,
        help_text="Status of the file relative to our system.",
    )

    info = models.JSONField(
        null=True,
        help_text="output of gdalinfo or ogrinfo.",
    )

    original_name = models.CharField(
        max_length=1024,
        null=True,
    )

    mimetype = models.CharField(
        null=True,
        max_length=256,
    )

    url = models.CharField(
        max_length=1024,
        validators=[URLValidator(schemes=SUPPORTED_SCHEMES)],
        null=True,
    )

    geometry = models.PolygonField(
        srid=settings.DEFAULT_CRS,
        help_text="Represents the polygon that encompasses the datalayer. It can be null.",
        null=True,
    )

    # right now we have the following metadata fields for rasters, which can be different
    # from vectors. to support both formats cleanly, a JSON field, with a custom validator
    # that depends on the type of the datalyer might be appropriate
    metadata = models.JSONField(null=True)

    objects: "Manager[DataLayer]" = DataLayerManager()

    def get_public_url(self) -> Optional[str]:
        if not self.url:
            return None
        object_name = self.url.replace(f"f3://{settings.S3_BUCKET}/", "")
        return create_download_url(settings.S3_BUCKET, object_name)

    def __str__(self) -> str:
        return f"{self.name} [{self.type}]"

    class Meta(TypedModelMeta):
        ordering = ("organization", "dataset", "id")
        verbose_name = "Datalayer"
        verbose_name_plural = "Datalayers"
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "dataset",
                    "name",
                    "type",
                ],
                name="datalayer_unique_constraint",
            )
        ]
