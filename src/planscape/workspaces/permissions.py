from collaboration.permissions import CheckPermissionMixin
from django.contrib.auth.models import AbstractUser
from planscape.permissions import PlanscapePermission

from workspaces.access import get_workspace_role
from workspaces.models import Workspace, WorkspaceRole


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

    @staticmethod
    def can_manage_members(user: AbstractUser, workspace: Workspace) -> bool:
        return get_workspace_role(user, workspace) == WorkspaceRole.OWNER


class WorkspaceViewPermission(PlanscapePermission):
    permission_set = WorkspacePermission

    def has_object_permission(self, request, view, obj):
        match view.action:
            case "invite":
                return self.permission_set.can_manage_members(request.user, obj)
            case "accept_invite":
                # Authorization here is "there's a pending invite matching
                # your email", which the service layer checks (and 404s on).
                # The requester doesn't have workspace access yet, so the
                # usual can_view gate doesn't apply.
                return True
            case "manage_invite":
                return self.permission_set.can_manage_members(request.user, obj)
            case "manage_user":
                user_id = view.kwargs.get("user_id")
                if request.method == "DELETE" and str(request.user.pk) == str(user_id):
                    # Self-leave; the creator-can't-leave rule is enforced in
                    # the service layer, not here.
                    return True
                return self.permission_set.can_manage_members(request.user, obj)
            case _:
                return super().has_object_permission(request, view, obj)
