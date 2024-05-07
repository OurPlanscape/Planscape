from django.contrib.gis.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.auth import get_user_model
from core.models import CreatedAtMixin, UUIDMixin, UpdatedAtMixin, DeletedAtMixin
from organizations.models import Organization

User = get_user_model()


class ProjectVisibility(models.TextChoices):
    PUBLIC = (
        "PUBLIC",
        "Public",
    )
    PRIVATE = (
        "PRIVATE",
        "Private",
    )


class ProjectCapabilities(models.TextChoices):
    EXPLORE = (
        "EXPLORE",
        "Explore",
    )
    PLAN = (
        "PLAN",
        "Plan",
    )


def default_capabilities():
    return [
        ProjectCapabilities.EXPLORE,
        ProjectCapabilities.PLAN,
    ]


class Project(
    UUIDMixin,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    models.Model,
):
    """Project represents a region that can contain it's own
    metrics, treatment goals and vector layers.

    In our current setup, sierra-nevada, southern-california, etc
    are projects.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.RESTRICT,
        related_name="projects",
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.RESTRICT,
        related_name="created_projects",
        null=True,
    )

    name = models.CharField(
        max_length=128,
    )
    display_name = models.CharField(
        max_length=128,
        null=True,
    )
    visibility = models.CharField(
        choices=ProjectVisibility.choices,
        default=ProjectVisibility.PRIVATE,
        max_length=64,
        help_text="Visibility choice to control project visibility to external clients",
    )

    capabilities = ArrayField(
        models.CharField(
            choices=ProjectCapabilities.choices,
            max_length=64,
        ),
        default=default_capabilities,
        help_text="Models our per project feature flags",
    )

    geometry = models.MultiPolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
    )

    class Meta:
        verbose_name = "Project"
        verbose_name_plural = "Projects"
