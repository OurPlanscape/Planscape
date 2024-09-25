from django.db import models
from django_stubs_ext.db.models import TypedModelMeta
from django.contrib.auth import get_user_model
from core.models import CreatedAtMixin, DeletedAtMixin, UUIDMixin, UpdatedAtMixin

User = get_user_model()


class OrganizationType(models.TextChoices):
    ACADEMIC = "ACADEMIC", "Academic"
    GOVERNMENT = "GOVERNMENT", "Government"
    COMMERCIAL = "COMMERCIAL", "Commercial"
    PRIVATE_LANDOWNERS = "PRIVATE_LANDOWNERS", "Private Landowners"
    TRIBAL = "TRIBAL", "Tribal"
    COLLABORATIVES = "COLLABORATIVES", "Collaboratives"
    OTHER = "OTHER", "Other"


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

    name = models.CharField(max_length=256)

    type = models.CharField(choices=OrganizationType.choices)
    type_other = models.CharField(null=True)

    website = models.URLField(
        null=True,
    )

    class Meta(TypedModelMeta):
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
