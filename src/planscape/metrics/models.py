from django.db import models
from django.db.models import functions
from django.contrib.postgres.fields import ArrayField
from treebeard.mp_tree import MP_Node
from core.models import UUIDMixin, CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin
from datasets.models import Dataset
from organizations.models import Organization
from projects.models import Project
from django.contrib.auth import get_user_model


User = get_user_model()


class MetricCapabilities(models.TextChoices):
    MAP_VIEW = "MAP_VIEW", "Map View"
    OPTIMIZATION = "OPTIMIZATION", "Optimization"


def get_default_metric_capabilities():
    return [
        MetricCapabilities.MAP_VIEW,
        MetricCapabilities.OPTIMIZATION,
    ]


class Category(
    UUIDMixin,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    MP_Node,
):
    owner = models.ForeignKey(
        User,
        related_name="owned_categories",
        on_delete=models.RESTRICT,
    )

    organization = models.ForeignKey(
        Organization,
        related_name="categories",
        on_delete=models.RESTRICT,
    )

    # categories can belong to a project or not
    # if they don't belong to projects, it means
    # they are the default hierarchy for organization
    project = models.ForeignKey(
        Project,
        related_name="categories",
        on_delete=models.RESTRICT,
        null=True,
    )

    name = models.CharField(max_length=128)

    # redeclares path field from MP_Node
    # this will contain the full path between nested categories
    # Air Quality/Particulate Matter, for example
    path = models.CharField(max_length=512)

    node_order_by = [
        "name",
    ]

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "project", "name"],
                include=["path"],
                name="category_organization_project_unique_constraint",
            )
        ]

        verbose_name = "Category"
        verbose_name_plural = "Categories"


class Metric(models.Model):
    """
    Represents a metric that needs to be processed and will be used by the system.

    For reference, the legacy "model" that represent a metric will be in separate
    places, according to the following list:

    Metric:
    * "metric_name": "threatened_endangered_vertebrate_species_richness"
    * "display_name": "Threatened/Endangered Vertebrate Species Richness"

    Dataset
    * "data_units": "Number of Species"
    * "data_provider": "FVEG 2023, California Department of Fish and Wildlife",
    * "source": "Northern California Regional Resource Kit",
    * "source_link": "https://wildfiretaskforce.org/northern-california-regional-resource-kit/",
    * "reference_link": "https://rrk.sdsc.edu/norcal/p/Northern%20California%20Region%20Metric%20Dictionary18Oct23.pdf#page=42",

    Treatment Goals
    * "output_units": "Avg number of Species"

    Will be removed
    * "max_value": 6 - can be calculated from raster
    * "min_value": 0 - can be calculated from raster
    * "raw_data_download_path": "northern-california/bioDiverConserv/Tier2/t_e_species_richness_202304.tif" - can be calculated
    * "raw_layer": ":bioDiverConserv_Tier2_t_e_species_richness_202304"
    * "data_download_link": "https://data.fs.usda.gov/geodata/rastergateway/regional-resource-kit/docs/forestResil.zip"
    * "data_year": "2021"
    * "invert_raw": true
    """

    owner = models.ForeignKey(
        User,
        on_delete=models.RESTRICT,
        related_name="owned_metrics",
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.RESTRICT,
        related_name="metrics",
        null=True,
    )

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.RESTRICT,
        related_name="metrics",
    )

    # a metric needs to have a category
    # a metric can only have a category that matches
    # the project they have
    # do we need this?
    category = models.ForeignKey(
        Category,
        related_name="metrics",
        on_delete=models.RESTRICT,
        help_text="category that this metric belongs to. e.g. Air Quality/Particulate Matter",
    )

    name = models.CharField(max_length=128)

    display_name = models.CharField(max_length=128)

    capabilities = ArrayField(
        models.CharField(choices=MetricCapabilities.choices),
        default=get_default_metric_capabilities,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                name="metric_project_unique_constraint",
            )
        ]
