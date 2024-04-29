from django.contrib.postgres.fields import ArrayField
from django.contrib.auth import get_user_model
from django.contrib.gis.db import models
from django.conf import settings
from core.models import CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, UUIDMixin
from organizations.models import Organization


User = get_user_model()


class DatasetType(models.TextChoices):

    VECTOR = "VECTOR", "Vector"
    RASTER = "RASTER", "Raster"


class DatasetBlobStatus(models.TextChoices):
    """
    Represents an enumeration of possible dataset blob statuses.
    This is about the life-cycle of the dataset.
    """

    PENDING_UPLOAD = "PENDING_UPLOAD", "Pending Upload"
    READY = "READY", "Ready"


class Dataset(
    UUIDMixin,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    models.Model,
):
    """
    Represents a GIS dataset that can be used in a metric
    or in a restriction area.
    """

    owner = models.ForeignKey(
        User,
        on_delete=models.RESTRICT,
        related_name="owned_datasets",
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.RESTRICT,
        related_name="datasets",
    )

    name = models.CharField(max_length=256)

    type = models.CharField(
        choices=DatasetType.choices,
    )

    blob_status = models.CharField(
        choices=DatasetBlobStatus.choices,
        default=DatasetBlobStatus.PENDING_UPLOAD,
    )

    info = models.JSONField(
        null=True,
        help_text="Contains the result of ogrinfo or gdalinfo in this dataset. This has important information on how the dataset behaves. Can only be obtained after the dataset is in storage.",
    )

    url = models.URLField(
        max_length=512,
        help_text="URL of the dataset in storage. Most like an s3 url.",
    )

    geometry = models.PolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
        help_text="Bounding Box of the dataset",
    )

    operations = ArrayField(
        models.CharField(max_length=64),
        help_text="List of the operations this dataset passed through. Operations at the head of the list were applied last.",
        null=True,
    )

    data_units = models.CharField(max_length=128, null=True)

    provider = models.CharField(max_length=256, null=True)

    source = models.CharField(max_length=256, null=True)

    source_url = models.URLField(max_length=512, null=True)

    reference_url = models.URLField(max_length=512, null=True)

    class Meta:

        verbose_name = "Dataset"
        verbose_name_plural = "Datasets"
