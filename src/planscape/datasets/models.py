from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import uuid4

from cacheops import cached
from core.flags import feature_enabled
from core.gcs import create_download_url as create_gcs_download_url
from core.gcs import is_gcs_file
from core.models import CreatedAtMixin, DeletedAtMixin, UpdatedAtMixin
from core.s3 import create_download_url as create_s3_download_url
from core.s3 import is_s3_file
from core.schemes import SUPPORTED_SCHEMES
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.gis.db import models
from django.contrib.gis.db.models.functions import Area
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator, URLValidator
from django.db.models import Manager
from django_stubs_ext.db.models import TypedModelMeta
from organizations.models import Organization
from treebeard.mp_tree import MP_Node
from utils.frontend import get_base_url, get_domain

User = get_user_model()


def validate_dataset_modules(value: Optional[List[str]]) -> None:
    if value is None:
        return
    from modules.base import MODULE_HANDLERS

    valid = set(MODULE_HANDLERS.keys())
    invalid = sorted({module for module in value if module not in valid})
    if invalid:
        raise ValidationError(
            "Invalid module name(s): %(invalid)s.",
            params={"invalid": ", ".join(invalid)},
        )


class VisibilityOptions(models.TextChoices):
    PRIVATE = "PRIVATE", "Private"
    PUBLIC = "PUBLIC", "Public"


class SelectionTypeOptions(models.TextChoices):
    SINGLE = "SINGLE", "Single"
    MULTIPLE = "MULTIPLE", "Multiple"


class PreferredDisplayType(models.TextChoices):
    MAIN_DATALAYERS = "MAIN_DATALAYERS", "Main DataLayers"
    BASE_DATALAYERS = "BASE_DATALAYERS", "Base DataLayers"


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

    datalayers: models.QuerySet["DataLayer"]
    categories: models.QuerySet["Category"]

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

    selection_type = models.CharField(
        choices=SelectionTypeOptions.choices,
        null=True,
        blank=True,
        max_length=32,
    )

    preferred_display_type = models.CharField(
        choices=PreferredDisplayType.choices,
        null=True,
        blank=True,
        max_length=32,
    )
    modules = ArrayField(
        base_field=models.CharField(max_length=32),
        null=True,
        blank=True,
        validators=[validate_dataset_modules],
        help_text="List of modules this dataset is associated with.",
    )

    def __str__(self) -> str:
        return f"{self.name} [{self.organization}] "

    class Meta(TypedModelMeta):
        verbose_name = "Dataset"
        verbose_name_plural = "Datasets"


class Category(CreatedAtMixin, UpdatedAtMixin, MP_Node):
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

    datalayers: models.QuerySet["DataLayer"]

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

    @cached(timeout=settings.CATEGORY_PATH_TTL)
    def _get_full_path(self, id: int) -> List[str]:
        category = self._meta.model.objects.get(pk=id)
        ancestors = list([c.name for c in category.get_ancestors()])
        names = [*ancestors, category.name]
        return names

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


class MapServiceChoices(models.TextChoices):
    VECTORTILES = "VECTORTILES", "Vector Tiles"
    COG = "COG", "Cog"
    ESRI_GEOJSON = "ESRI_GEOJSON", "ESRI GeoJSON"
    ESRI_VECTORTILES = "ESRI_VECTORTILES", "ESRI Vector Tiles"
    GEOJSON = "GEOJSON", "GeoJSON"


class DataLayerQuerySet(models.QuerySet):
    def geometric_intersection(
        self, geometry_field: str = "geometry"
    ) -> Optional[GEOSGeometry]:
        geometries = (
            self.all()
            .annotate(area=Area(geometry_field))
            .order_by("-area")
            .values_list(
                geometry_field,
                flat=True,
            )
        )
        temp_geometry = None
        for i, geometry in enumerate(geometries):
            try:
                next_geometry = geometries[i + 1]
            except IndexError:
                break
            comparison = temp_geometry if temp_geometry else geometry

            if not comparison or not comparison.intersects(next_geometry):
                return None
            temp_geometry = comparison.intersection(next_geometry)

        return temp_geometry

    def by_meta_module(self, module: str):
        return self.all().filter(metadata__modules__has_key=module)

    def by_meta_name(self, name: str):
        query = {"modules": {"forsys": {"name": name}}}
        return self.all().filter(metadata__contains=query).first()

    def by_meta_capability(self, capability: str):
        query = {"modules": {"forsys": {"capabilities": [capability]}}}
        return self.all().filter(metadata__contains=query)


class DataLayerManager(models.Manager):
    def get_queryset(self):
        return DataLayerQuerySet(self.model, using=self._db).filter(deleted_at=None)


class Style(
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    models.Model,
):
    id: int

    uuid = models.UUIDField(
        null=True,
        default=uuid4,
    )

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="created_styles",
        on_delete=models.RESTRICT,
    )

    organization_id: int
    organization = models.ForeignKey(
        Organization,
        related_name="styles",
        on_delete=models.RESTRICT,
        null=True,
    )

    name = models.CharField(max_length=128)

    type = models.CharField(
        choices=DataLayerType.choices,
        default=DataLayerType.RASTER,
    )

    data_hash = models.CharField(
        max_length=256,
        null=True,
    )

    data = models.JSONField()

    def __str__(self):
        return f"{self.name} [{self.type}]"

    class Meta(TypedModelMeta):
        ordering = ("organization", "id")
        verbose_name = "Style"
        verbose_name_plural = "Styles"
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "organization",
                    "name",
                    "type",
                ],
                name="style_unique_constraint",
            )
        ]


class StorageTypeChoices(models.TextChoices):
    DATABASE = "DATABASE", "Database"
    FILESYSTEM = "FILE_SYSTEM", "File System"
    EXTERNAL_SERVICE = "EXTERNAL_SERVICE", "External Service"


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

    storage_type = models.CharField(
        max_length=64,
        choices=StorageTypeChoices.choices,
        default=StorageTypeChoices.FILESYSTEM,
    )

    map_service_type = models.CharField(
        max_length=64,
        choices=MapServiceChoices.choices,
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
        validators=[
            URLValidator(
                schemes=SUPPORTED_SCHEMES,
                regex=r"^((s3|gs):\/\/[^\/]+\/.+)|((http|https|ftp|ftps):\/\/[^\s\/$.?#].[^\s]*)$",
            )
        ],
        null=True,
    )

    table = models.CharField(
        max_length=256,
        null=True,
        validators=[
            RegexValidator(r"^(?<schema>\w+)\.(?<table>\w+)$"),
        ],
    )

    geometry = models.PolygonField(
        srid=settings.DEFAULT_CRS,
        help_text="Represents the polygon that encompasses the datalayer. It can be null.",
        null=True,
    )
    outline = models.MultiPolygonField(
        srid=settings.DEFAULT_CRS,
        help_text="Represents the detailed geometry of the layer. Only shows where there is data at the time of upload",
        null=True,
    )
    hash = models.CharField(
        null=True,
        max_length=256,
        help_text="SHA256 hash of the original file. Calculated before upload is done, but after any transformations.",
    )

    # right now we have the following metadata fields for rasters, which can be different
    # from vectors. to support both formats cleanly, a JSON field, with a custom validator
    # that depends on the type of the datalyer might be appropriate
    metadata = models.JSONField(null=True)

    styles = models.ManyToManyField(
        to=Style,
        through="DataLayerHasStyle",
        through_fields=("datalayer", "style"),
    )

    objects: "Manager[DataLayer]" = DataLayerManager()

    def get_model_name(self):
        """
        Returns a fake, unique name for a the dynamically generated model.
        """
        layer_id = str(self.pk).zfill(5)
        return f"DataLayer{layer_id}"

    def get_public_url(self) -> Optional[str]:
        if not self.url:
            return None
        
        if feature_enabled("INTERNAL_RASTER_PROXY"):
            base_url = get_base_url(settings.ENV)
            path_url = self.url.split("/datalayers/")[-1]
            download_url = f"{base_url}/datalayers/{path_url}"

        elif is_s3_file(self.url):
            object_name = self.url.replace(f"s3://{settings.S3_BUCKET}/", "")
            download_url = create_s3_download_url(settings.S3_BUCKET, object_name)
            if feature_enabled("FEATURE_FLAG_S3_PROXY"):
                parsed = urlparse(download_url)

                new_url = parsed._replace(
                    netloc=get_domain(settings.ENV),
                    path="/s3" + str(parsed.path),
                )
                download_url = str(new_url.geturl())

        elif is_gcs_file(self.url):
            download_url = create_gcs_download_url(self.url)
        else:
            download_url = None

        return download_url

    def get_map_url(self) -> Optional[str]:
        if self.storage_type == StorageTypeChoices.EXTERNAL_SERVICE:
            return self.url
        if self.type == DataLayerType.RASTER:
            return self.get_public_url()
        if self.table and self.storage_type == StorageTypeChoices.DATABASE:
            base = get_base_url(settings.ENV) or f"https://{get_domain(settings.ENV)}"
            return base + "/tiles/dynamic/{z}/{x}/{y}?layer=" + str(self.id)

        return None

    def get_assigned_style(self) -> Optional[Style]:
        return self.styles.all().first()

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


class DataLayerHasStyle(
    CreatedAtMixin,
    UpdatedAtMixin,
    models.Model,
):
    datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.CASCADE,
        related_name="rel_styles",
    )
    style = models.ForeignKey(
        Style,
        on_delete=models.CASCADE,
        related_name="rel_styles",
    )
    default = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = (
            "datalayer",
            "style",
        )
        verbose_name = "DataLayer has Style"
        verbose_name_plural = "DataLayer Has Styles"
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "datalayer",
                    "style",
                ],
                name="datalayerhasstyle_unique_constraint",
            )
        ]


@dataclass
class SearchResult:
    id: int
    name: str
    type: str
    data: Dict[str, Any]

    def key(self):
        return f"{self.type}:{self.id}"
