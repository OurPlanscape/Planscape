from django.contrib.auth import get_user_model
from django.contrib.gis.db import models
from django_stubs_ext.db.models import TypedModelMeta

from core.models import CreatedAtMixin, DeletedAtMixin, UpdatedAtMixin
from datasets.models import VisibilityOptions

User = get_user_model()


class WorkspaceRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    COLLABORATOR = "COLLABORATOR", "Collaborator"
    VIEWER = "VIEWER", "Viewer"


class Workspace(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int

    name = models.CharField(max_length=256)
    visibility = models.CharField(
        choices=VisibilityOptions.choices,
        default=VisibilityOptions.PRIVATE,
        max_length=16,
    )

    def __str__(self) -> str:
        return self.name

    class Meta(TypedModelMeta):
        verbose_name = "Workspace"
        verbose_name_plural = "Workspaces"


class UserAccessWorkspace(CreatedAtMixin, UpdatedAtMixin, models.Model):
    id: int

    user_id: int
    user = models.ForeignKey(
        User,
        related_name="workspace_access",
        on_delete=models.CASCADE,
    )

    workspace_id: int
    workspace = models.ForeignKey(
        Workspace,
        related_name="user_access",
        on_delete=models.CASCADE,
    )

    role = models.CharField(
        choices=WorkspaceRole.choices,
        max_length=16,
        default=WorkspaceRole.VIEWER,
    )

    class Meta(TypedModelMeta):
        verbose_name = "User Access Workspace"
        verbose_name_plural = "User Access Workspaces"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "workspace"],
                name="unique_user_workspace_access",
            )
        ]
