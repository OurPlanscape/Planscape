from typing import Optional

from collaboration.permissions import CheckPermissionMixin
from django.contrib.auth.models import AbstractUser
from planscape.permissions import PlanscapePermission

from workspaces.models import UserAccessWorkspace, Workspace, WorkspaceRole


def get_workspace_role(
    user: AbstractUser,
    workspace: Workspace,
) -> Optional[str]:
    """
    Returns the role the user holds in the workspace, or None.
    The creator is always treated as an owner, even if the access row is gone.
    """
    if not user or not user.is_authenticated:
        return None

    if workspace.created_by_id and workspace.created_by_id == user.pk:
        return WorkspaceRole.OWNER

    access = UserAccessWorkspace.objects.filter(
        user=user,
        workspace=workspace,
    ).first()
    return access.role if access else None


VIEWER_PERMISSIONS = [
    "view_workspace",
]
COLLABORATOR_PERMISSIONS = VIEWER_PERMISSIONS + [
    "add_planningarea",
]
OWNER_PERMISSIONS = COLLABORATOR_PERMISSIONS + [
    "change_workspace",
    "remove_workspace",
    "view_collaborator",
    "add_collaborator",
    "change_collaborator",
    "delete_collaborator",
]

WORKSPACE_PERMISSIONS = {
    WorkspaceRole.OWNER: OWNER_PERMISSIONS,
    WorkspaceRole.COLLABORATOR: COLLABORATOR_PERMISSIONS,
    WorkspaceRole.VIEWER: VIEWER_PERMISSIONS,
}


def get_workspace_permissions(
    user: AbstractUser,
    workspace: Workspace,
) -> list:
    role = get_workspace_role(user, workspace)
    return list(WORKSPACE_PERMISSIONS.get(role, []))


class WorkspacePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, workspace: Workspace) -> bool:
        return get_workspace_role(user, workspace) is not None

    @staticmethod
    def can_add(user: AbstractUser, workspace: Workspace) -> bool:
        return get_workspace_role(user, workspace) in (
            WorkspaceRole.OWNER,
            WorkspaceRole.COLLABORATOR,
        )

    @staticmethod
    def can_change(user: AbstractUser, workspace: Workspace) -> bool:
        return get_workspace_role(user, workspace) == WorkspaceRole.OWNER

    @staticmethod
    def can_remove(user: AbstractUser, workspace: Workspace) -> bool:
        return get_workspace_role(user, workspace) == WorkspaceRole.OWNER


class WorkspaceViewPermission(PlanscapePermission):
    permission_set = WorkspacePermission
