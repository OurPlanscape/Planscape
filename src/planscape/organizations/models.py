from core.models import CreatedAtMixin, DeletedAtMixin, UpdatedAtMixin, UUIDMixin
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta

User = get_user_model()


class OrganizationType(models.TextChoices):
    ACADEMIC = "ACADEMIC", "Academic"
    GOVERNMENT = "GOVERNMENT", "Government"
    COMMERCIAL = "COMMERCIAL", "Commercial"
    PRIVATE_LANDOWNERS = "PRIVATE_LANDOWNERS", "Private Landowners"
    TRIBAL = "TRIBAL", "Tribal"
    COLLABORATIVES = "COLLABORATIVES", "Collaboratives"
    OTHER = "OTHER", "Other"


class OrganizationManager(models.Manager):
    def get_main_org(self, name=settings.MAIN_ORG_NAME) -> "Organization":
        return self.get_queryset().get(name=name)


class Organization(
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    UUIDMixin,
    models.Model,
):
    id: int

    created_by = models.ForeignKey(
        User,
        related_name="created_organizations",
        on_delete=models.RESTRICT,
    )
    created_by_id: int

    categories: models.QuerySet["Category"]
    datasets: models.QuerySet["Dataset"]
    datalayers: models.QuerySet["DataLayer"]

    name = models.CharField(max_length=256)

    type = models.CharField(choices=OrganizationType.choices)
    type_other = models.CharField(null=True)

    website = models.URLField(
        null=True,
    )

    objects: "Manager[Organization]" = OrganizationManager()

    def __str__(self):
        return f"{self.name} [{self.type}]"

    class Meta(TypedModelMeta):
        ordering = ("id",)
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        constraints = [
            models.UniqueConstraint(
                fields=("name",),
                name="organization_name_unique",
            )
        ]
