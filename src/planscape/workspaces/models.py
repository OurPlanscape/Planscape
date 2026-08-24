from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from django.contrib.gis.db import models
from django.db.models import Count, Q
from django_stubs_ext.db.models import TypedModelMeta

from core.models import AliveObjectsManager, CreatedAtMixin, DeletedAtMixin, UpdatedAtMixin
from datasets.models import VisibilityOptions

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser

User = get_user_model()


class WorkspaceRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    COLLABORATOR = "COLLABORATOR", "Collaborator"
    VIEWER = "VIEWER", "Viewer"


class WorkspaceKind(models.TextChoices):
    """
    Separates the data-catalog workspaces (which group Datasets, Styles and
    DataLayers and are managed through the admin API) from the user-facing
    workspaces that group Planning Areas.
    """

    DATA = "DATA", "Data Catalog"
    PLANNING = "PLANNING", "Planning"


class WorkspaceManager(AliveObjectsManager):
    def list_by_user(self, user: "AbstractUser") -> models.QuerySet:
        if not user or not user.is_authenticated:
            return self.get_queryset().none()
        return self.get_queryset().filter(
            kind=WorkspaceKind.PLANNING,
            user_access__user=user,
        )

    def list_for_api(self, user: "AbstractUser") -> models.QuerySet:
        return (
            self.list_by_user(user)
            .annotate(
                planning_areas_count=Count(
                    "planning_areas",
                    filter=Q(planning_areas__deleted_at=None),
                    distinct=True,
                ),
                collaborators_count=Count("user_access", distinct=True),
            )
            .select_related("created_by")
            .distinct()
        )


class Workspace(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int

    name = models.CharField(max_length=256)
    visibility = models.CharField(
        choices=VisibilityOptions.choices,
        default=VisibilityOptions.PRIVATE,
        max_length=16,
    )

    kind = models.CharField(
        choices=WorkspaceKind.choices,
        default=WorkspaceKind.DATA,
        max_length=16,
        help_text="What this workspace groups: data catalog entries or planning areas.",
    )

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="created_workspaces",
        on_delete=models.SET_NULL,
        null=True,
        help_text="User that created the Workspace.",
    )

    # Snapshot taken at creation time so the creator keeps being displayed even
    # if they leave the workspace or their account goes away.
    creator_name = models.CharField(
        max_length=256,
        null=True,
        help_text="Name of the user that created the Workspace, at creation time.",
    )

    objects: WorkspaceManager = WorkspaceManager()

    def __str__(self) -> str:
        return self.name

    class Meta(TypedModelMeta):
        verbose_name = "Workspace"
        verbose_name_plural = "Workspaces"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "created_by",
                    "name",
                ],
                name="unique_workspace_name_per_creator",
                condition=Q(deleted_at=None),
            )
        ]


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
