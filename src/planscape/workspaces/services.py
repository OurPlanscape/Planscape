import logging
from typing import Tuple

from actstream import action
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.db import transaction
from planscape.analytics import track_event
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from workspaces.events import publish_member_event, publish_workspace_deleted
from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)
from workspaces.permissions import WorkspacePermission
from workspaces.tasks import send_workspace_invitation

logger = logging.getLogger(__name__)
User = get_user_model()


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
    # Published before the soft delete so every connected client still gets it.
    publish_workspace_deleted(workspace, actor=user)
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
    """Invites a user to a workspace by email. Registered users get access right
    away. Emails without an account stay pending (user=None) until accepted via
    `accept_invite`."""
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

    invitee = User.objects.filter(email__iexact=email).first()
    access, _created = UserAccessWorkspace.objects.update_or_create(
        email=email,
        workspace=workspace,
        user=None,
        defaults={"role": role, "invited_by": inviter, "user": invitee},
    )

    send_workspace_invitation.delay(access.pk, message)

    if invitee is not None:
        publish_member_event(
            "workspace.member.added",
            workspace,
            user_id=invitee.pk,
            role=role,
            actor=inviter,
        )

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
    publish_member_event(
        "workspace.member.added",
        workspace,
        user_id=user.pk,
        role=access.role,
        actor=user,
    )

    track_event(
        name="workspace.member.invite_accepted",
        properties={"workspace_id": workspace.pk, "email": user.email},
        user_id=user.pk,
    )
    return access


def accept_pending_invites(user: AbstractUser) -> list[UserAccessWorkspace]:
    """Accepts every pending invite sent to the user's email, for accounts
    created after they were invited."""
    pending = UserAccessWorkspace.objects.filter(
        user__isnull=True,
        email__iexact=user.email,
    ).select_related("workspace")
    return [accept_invite(user=user, workspace=access.workspace) for access in pending]


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
    publish_member_event(
        "workspace.member.role_changed",
        workspace,
        user_id=int(target_user_id),
        role=role,
        actor=actor,
    )

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
    publish_member_event(
        "workspace.member.left" if is_self else "workspace.member.removed",
        workspace,
        user_id=int(target_user_id),
        actor=actor,
    )

    track_event(
        name="workspace.member.left" if is_self else "workspace.member.removed",
        properties={
            "workspace_id": workspace.pk,
            "target_user_id": target_user_id,
            "email": actor.email if actor else None,
        },
        user_id=actor.pk,
    )


def _get_pending_invite(
    workspace: Workspace,
    invite_id: int,
) -> UserAccessWorkspace:
    invite = workspace.user_access.filter(pk=invite_id, user__isnull=True).first()
    if not invite:
        raise NotFound("This invite does not exist or was already accepted.")
    return invite


def update_invite_role(
    actor: AbstractUser,
    workspace: Workspace,
    invite_id: int,
    role: str,
) -> UserAccessWorkspace:
    """Changes the role a pending invite will grant once it is accepted.
    Accepted memberships go through `update_member_role` instead - they are
    keyed by user, and a pending row has no user yet."""
    if not WorkspacePermission.can_manage_members(actor, workspace):
        raise PermissionDenied(
            "You do not have permission to change roles in this workspace."
        )
    invite = _get_pending_invite(workspace, invite_id)
    invite.role = role
    invite.save()

    track_event(
        name="workspace.invite.role_changed",
        properties={
            "workspace_id": workspace.pk,
            "invitee_email": invite.email,
            "role": role,
            "email": actor.email if actor else None,
        },
        user_id=actor.pk,
    )
    return invite


def revoke_invite(
    actor: AbstractUser,
    workspace: Workspace,
    invite_id: int,
) -> None:
    if not WorkspacePermission.can_manage_members(actor, workspace):
        raise PermissionDenied("You do not have permission to revoke this invite.")
    invite = _get_pending_invite(workspace, invite_id)
    invitee_email = invite.email
    invite.delete()

    track_event(
        name="workspace.invite.revoked",
        properties={
            "workspace_id": workspace.pk,
            "invitee_email": invitee_email,
            "email": actor.email if actor else None,
        },
        user_id=actor.pk,
    )
