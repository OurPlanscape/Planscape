import logging
from typing import Tuple

from actstream import action
from django.contrib.auth.models import AbstractUser
from django.db import transaction
from planscape.analytics import track_event
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)
from workspaces.permissions import WorkspacePermission
from workspaces.tasks import send_workspace_invitation

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


@transaction.atomic()
def invite_member(
    inviter: AbstractUser,
    workspace: Workspace,
    email: str,
    role: str,
    message: str = "",
) -> UserAccessWorkspace:
    """Invites a user to a workspace by email. The invite is always created as
    pending (user=None) - even if the email already belongs to a registered
    user - and must be accepted via `accept_invite`."""
    if not WorkspacePermission.can_manage_members(inviter, workspace):
        raise PermissionDenied(
            "You do not have permission to invite members to this workspace."
        )
    email = email.lower()
    already_member = workspace.user_access.filter(user__email__iexact=email).exists()
    if already_member:
        raise ValidationError(
            {"email": "This user is already a member of the workspace."}
        )

    access, _created = UserAccessWorkspace.objects.update_or_create(
        email=email,
        workspace=workspace,
        user=None,
        defaults={"role": role, "invited_by": inviter},
    )

    send_workspace_invitation.delay(access.pk, message)

    track_event(
        name="workspace.member.invited",
        properties={
            "workspace_id": workspace.pk,
            "role": role,
            "invitee_email": email,
            "email": inviter.email if inviter else None,
        },
        user_id=inviter.pk,
    )
    return access


@transaction.atomic()
def accept_invite(user: AbstractUser, workspace: Workspace) -> UserAccessWorkspace:
    """Upserts a pending invite (matched by the requester's email) into an
    active membership row for the requesting user."""
    access = UserAccessWorkspace.objects.filter(
        workspace=workspace,
        user__isnull=True,
        email__iexact=user.email,
    ).first()
    if not access:
        raise NotFound("No pending invite found for this user and workspace.")

    access.user = user
    access.save()

    track_event(
        name="workspace.member.invite_accepted",
        properties={"workspace_id": workspace.pk, "email": user.email},
        user_id=user.pk,
    )
    return access


def update_member_role(
    actor: AbstractUser,
    workspace: Workspace,
    target_user_id: int,
    role: str,
) -> UserAccessWorkspace:
    if not WorkspacePermission.can_manage_members(actor, workspace):
        raise PermissionDenied(
            "You do not have permission to change roles in this workspace."
        )
    if workspace.created_by_id and workspace.created_by_id == int(target_user_id):
        raise ValidationError(
            {"role": "The workspace creator's role cannot be changed."}
        )
    access = workspace.user_access.filter(user_id=target_user_id).first()
    if not access:
        raise NotFound("This user is not a member of the workspace.")

    access.role = role
    access.save()

    track_event(
        name="workspace.member.role_changed",
        properties={
            "workspace_id": workspace.pk,
            "target_user_id": target_user_id,
            "role": role,
            "email": actor.email if actor else None,
        },
        user_id=actor.pk,
    )
    return access


def remove_member(
    actor: AbstractUser,
    workspace: Workspace,
    target_user_id: int,
) -> None:
    is_self = actor.pk == int(target_user_id)

    if workspace.created_by_id and workspace.created_by_id == int(target_user_id):
        raise ValidationError(
            {
                "user_id": "The workspace creator cannot leave or be removed. "
                "Delete the workspace instead."
            }
        )

    if not is_self and not WorkspacePermission.can_manage_members(actor, workspace):
        raise PermissionDenied("You do not have permission to remove this member.")

    access = workspace.user_access.filter(user_id=target_user_id).first()
    if not access:
        raise NotFound("This user is not a member of the workspace.")

    access.delete()

    track_event(
        name="workspace.member.left" if is_self else "workspace.member.removed",
        properties={
            "workspace_id": workspace.pk,
            "target_user_id": target_user_id,
            "email": actor.email if actor else None,
        },
        user_id=actor.pk,
    )
