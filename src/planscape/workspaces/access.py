"""Access to planning areas, and everything under them, through workspaces.

The workspace role decides what a user can do on a planning area that belongs
to a workspace. Planning areas without a workspace still use planning-area
sharing (`collaboration.UserObjectRole`) until they're migrated.
"""

from typing import Optional

from collaboration.models import Permissions, Role, UserObjectRole
from collaboration.utils import (
    check_for_owner_permission,
    check_for_permission,
    is_creator,
)
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.models import ContentType
from planning.models import PlanningArea

from workspaces.models import UserAccessWorkspace, Workspace, WorkspaceRole

CREATOR_ROLE = "Creator"

VIEWER_PERMISSIONS = [
    "view_planningarea",
    "view_scenario",
    "view_tx_plan",
    "view_climate_foresight",
]
COLLABORATOR_PERMISSIONS = VIEWER_PERMISSIONS + [
    "add_scenario",
    "add_tx_plan",
    "clone_tx_plan",
    "edit_tx_plan",
    "remove_tx_plan",
    "add_tx_prescription",
    "remove_tx_prescription",
    "run_tx",
    "run_climate_foresight",
    "remove_climate_foresight",
    "change_climate_foresight",
]
OWNER_PERMISSIONS = COLLABORATOR_PERMISSIONS + [
    "change_scenario",
    "remove_scenario",
    "view_collaborator",
    "add_collaborator",
    "delete_collaborator",
    "change_collaborator",
    "change_planning_area",
]

# the planning-area role each workspace role grants
PLANNING_AREA_ROLES = {
    WorkspaceRole.OWNER: Role.OWNER,
    WorkspaceRole.COLLABORATOR: Role.COLLABORATOR,
    WorkspaceRole.VIEWER: Role.VIEWER,
}
PLANNING_AREA_PERMISSIONS = {
    Role.OWNER: OWNER_PERMISSIONS,
    Role.COLLABORATOR: COLLABORATOR_PERMISSIONS,
    Role.VIEWER: VIEWER_PERMISSIONS,
}


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


def is_workspace_owner(user: AbstractUser, planning_area: PlanningArea) -> bool:
    return (
        planning_area.workspace_id is not None
        and get_workspace_role(user, planning_area.workspace) == WorkspaceRole.OWNER
    )


def get_planning_area_role(
    user: AbstractUser,
    planning_area: PlanningArea,
) -> Optional[str]:
    """Returns `Creator`, or the Owner/Collaborator/Viewer role the user holds on
    the planning area, or None."""
    if not user or not user.is_authenticated:
        return None

    if is_creator(user, planning_area):
        return CREATOR_ROLE

    if planning_area.workspace_id is not None:
        workspace_role = get_workspace_role(user, planning_area.workspace)
        return PLANNING_AREA_ROLES.get(workspace_role)

    entry = UserObjectRole.objects.filter(
        collaborator_id=user.pk,
        content_type=ContentType.objects.get_for_model(planning_area),
        object_pk=planning_area.pk,
    ).first()
    return entry.role if entry else None


def get_planning_area_permissions(
    user: AbstractUser,
    planning_area: PlanningArea,
) -> list[str]:
    role = get_planning_area_role(user, planning_area)
    if role == CREATOR_ROLE:
        role = Role.OWNER
    if role is None:
        return []

    if planning_area.workspace_id is not None:
        return list(PLANNING_AREA_PERMISSIONS[role])
    return list(
        Permissions.objects.filter(role=role).values_list("permission", flat=True)
    )


def has_planning_area_permission(
    user: AbstractUser,
    planning_area: PlanningArea,
    permission: str,
) -> bool:
    """Whether the user's role on the planning area grants `permission`. Callers
    check the planning area's creator themselves."""
    if planning_area.workspace_id is None:
        return check_for_permission(user.pk, planning_area, permission)

    workspace_role = get_workspace_role(user, planning_area.workspace)
    role = PLANNING_AREA_ROLES.get(workspace_role)
    return permission in PLANNING_AREA_PERMISSIONS.get(role, [])


def has_planning_area_owner_permission(
    user: AbstractUser,
    planning_area: PlanningArea,
    permission: str,
) -> bool:
    """Like `has_planning_area_permission`, but only granted to owners."""
    if planning_area.workspace_id is None:
        return check_for_owner_permission(user.pk, planning_area, permission)

    return is_workspace_owner(user, planning_area) and permission in OWNER_PERMISSIONS
