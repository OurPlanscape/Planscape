import logging
from typing import Tuple

from actstream import action
from django.contrib.auth.models import AbstractUser
from django.db import transaction
from planscape.analytics import track_event

from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)
from workspaces.permissions import WorkspacePermission

logger = logging.getLogger(__name__)


@transaction.atomic()
def create_workspace(
    user: AbstractUser,
    name: str,
    **kwargs,
) -> Workspace:
    """Canonical method to create a new planning workspace."""
    workspace = Workspace.objects.create(
        name=name,
        kind=WorkspaceKind.PLANNING,
        created_by=user,
        creator_name=user.get_full_name(),
        **kwargs,
    )
    UserAccessWorkspace.objects.create(
        user=user,
        workspace=workspace,
        role=WorkspaceRole.OWNER,
    )
    action.send(user, verb="created", action_object=workspace)
    track_event(
        name="workspace.workspace.created",
        properties={
            "workspace_id": workspace.pk,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )
    return workspace


def delete_workspace(
    user: AbstractUser,
    workspace: Workspace,
) -> Tuple[bool, str]:
    if not WorkspacePermission.can_remove(user, workspace):
        logger.error(f"User {user} has no permission to delete {workspace.pk}")
        return (
            False,
            f"User does not have permission to delete workspace {workspace.pk}.",
        )

    action.send(user, verb="deleted", action_object=workspace)
    # Planning areas outlive the workspace. The delete below is a soft delete,
    # so on_delete=SET_NULL never fires and we have to detach them by hand to
    # avoid leaving live planning areas pointing at a dead workspace.
    workspace.planning_areas.update(workspace=None)
    workspace.delete()
    track_event(
        name="workspace.workspace.deleted",
        properties={
            "soft": True,
            "workspace_id": workspace.pk,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )
    return (True, "deleted")
