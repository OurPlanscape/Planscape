from django.contrib.gis.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from core.models import CreatedAtMixin, UpdatedAtMixin
from django.contrib.contenttypes.fields import GenericForeignKey


User = get_user_model()


class Role(models.TextChoices):
    # CREATOR - creator is not a role, but the user that created the planning area
    OWNER = "Owner"
    COLLABORATOR = "Collaborator"
    VIEWER = "Viewer"


class Permissions(models.Model):
    role = models.CharField(
        choices=Role.choices,
        max_length=16,
        default=Role.VIEWER,
    )
    permission = models.CharField(max_length=60)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="unique_permission",
            )
        ]


class UserObjectRole(CreatedAtMixin, UpdatedAtMixin, models.Model):
    # the email address invited to collaborate
    email = models.CharField(max_length=120)
    # the user that is being added as collaborator
    # might be empty if no user is found with the email
    collaborator = models.ForeignKey(
        User,
        related_name="object_roles",
        on_delete=models.CASCADE,
        null=True,
    )
    # the role assigned
    role = models.CharField(
        choices=Role.choices,
        max_length=16,
        default=Role.VIEWER,
    )
    # the user that invited the collaborator
    inviter = models.ForeignKey(
        User,
        related_name="invites",
        on_delete=models.CASCADE,
        null=False,
    )
    # use content types to potentially save other things that are not only planning_areas
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_pk = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_pk")

    class Meta:
        constraints = [
            # a person can only be invited once to a specific planning area
            models.UniqueConstraint(
                fields=[
                    "email",
                    "content_type",
                    "object_pk",
                ],
                name="unique_collaborator",
            )
        ]
