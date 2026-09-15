from typing import Any, Optional

from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from collaboration.models import UserObjectRole
from datasets.models import VisibilityOptions
from planning.models import PlanningArea
from workspaces.access import PLANNING_AREA_ROLES
from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)

DEFAULT_WORKSPACE_NAME = "Default"

# planning-area sharing roles, mapped to the workspace role with the same name
WORKSPACE_ROLES = {
    role: workspace_role for workspace_role, role in PLANNING_AREA_ROLES.items()
}


class Command(BaseCommand):
    help = (
        "Move every planning area into a planning workspace. Planning areas that "
        "were shared get their own workspace, with the people they were shared "
        "with added to it. The rest go to their creator's Default workspace."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be created without writing changes.",
        )
        parser.add_argument(
            "--planning-area-id",
            type=int,
            help="Only migrate a single planning area by id.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        dry_run: bool = options["dry_run"]
        planning_area_id: int | None = options.get("planning_area_id")

        planning_areas = PlanningArea.objects.select_related("user", "workspace")
        if planning_area_id is not None:
            planning_areas = planning_areas.filter(pk=planning_area_id)

        total = planning_areas.count()
        created = 0
        defaults = 0
        moved = 0
        skipped = 0
        members = 0
        invites = 0
        # creator id -> their Default workspace, None if a dry run didn't create it
        default_workspaces: dict[int, Optional[Workspace]] = {}

        if total == 0:
            self.stdout.write("No planning areas matched the given filters.")
            return

        for planning_area in planning_areas.iterator():
            shares = self._shares_of(planning_area)
            workspace = planning_area.workspace

            if workspace:
                skipped += 1
                self.stdout.write(
                    f"[SKIP] PlanningArea {planning_area.pk} already has "
                    f"Workspace {planning_area.workspace_id}."
                )
            elif shares or not planning_area.user_id:
                created += 1
                name = self._workspace_name_for(planning_area)
                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] Would create Workspace '{name}' for "
                        f"PlanningArea {planning_area.pk}."
                    )
                else:
                    with transaction.atomic():
                        workspace = self._create_workspace(name, planning_area.user)
                        planning_area.workspace = workspace
                        planning_area.save(update_fields=["workspace"])
                    self.stdout.write(
                        f"[OK] Created Workspace {workspace.pk} for PlanningArea "
                        f"{planning_area.pk}."
                    )
            else:
                user = planning_area.user
                if user.pk not in default_workspaces:
                    default_workspace = self._find_default_workspace(user)
                    if default_workspace is None:
                        defaults += 1
                        if not dry_run:
                            default_workspace = self._create_workspace(
                                DEFAULT_WORKSPACE_NAME, user
                            )
                    default_workspaces[user.pk] = default_workspace

                workspace = default_workspaces[user.pk]
                moved += 1
                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] Would move PlanningArea {planning_area.pk} to "
                        f"the Default Workspace of User {user.pk}."
                    )
                else:
                    planning_area.workspace = workspace
                    planning_area.save(update_fields=["workspace"])
                    self.stdout.write(
                        f"[OK] Moved PlanningArea {planning_area.pk} to Default "
                        f"Workspace {workspace.pk}."
                    )

            copied_members, copied_invites = self._copy_shares(
                workspace, shares, dry_run
            )
            members += copied_members
            invites += copied_invites
            if copied_members or copied_invites:
                prefix = "[DRY RUN] Would copy" if dry_run else "[OK] Copied"
                self.stdout.write(
                    f"{prefix} {copied_members} member(s) and {copied_invites} "
                    f"invite(s) from PlanningArea {planning_area.pk}."
                )

        self.stdout.write(
            f"Done. Matched={total}, created={created}, defaults={defaults}, "
            f"moved={moved}, skipped={skipped}, members={members}, "
            f"invites={invites}."
        )

    def _shares_of(self, planning_area: PlanningArea) -> list[UserObjectRole]:
        """People the planning area was shared with, its creator aside. Pending
        shares (no account yet) count too."""
        shares = UserObjectRole.objects.filter(
            content_type=ContentType.objects.get_for_model(PlanningArea),
            object_pk=planning_area.pk,
        ).select_related("collaborator", "inviter")
        return [
            share
            for share in shares
            if not share.collaborator_id
            or share.collaborator_id != planning_area.user_id
        ]

    def _find_default_workspace(self, user: AbstractUser) -> Optional[Workspace]:
        return Workspace.objects.filter(
            kind=WorkspaceKind.PLANNING,
            created_by=user,
            name=DEFAULT_WORKSPACE_NAME,
        ).first()

    def _create_workspace(self, name: str, owner: Optional[AbstractUser]) -> Workspace:
        with transaction.atomic():
            workspace = Workspace.objects.create(
                name=name,
                visibility=VisibilityOptions.PRIVATE,
                kind=WorkspaceKind.PLANNING,
                created_by=owner,
                creator_name=owner.get_full_name() if owner else None,
            )
            if owner:
                UserAccessWorkspace.objects.create(
                    user=owner,
                    workspace=workspace,
                    role=WorkspaceRole.OWNER,
                )
        return workspace

    def _copy_shares(
        self,
        workspace: Optional[Workspace],
        shares: list[UserObjectRole],
        dry_run: bool,
    ) -> tuple[int, int]:
        """Adds shares to the workspace: people with an account become members,
        the rest pending invites. `workspace` is None when a dry run didn't
        create it."""
        members = 0
        invites = 0
        with transaction.atomic():
            for share in shares:
                if workspace and self._has_access(workspace, share):
                    continue

                if share.collaborator_id:
                    members += 1
                else:
                    invites += 1
                if dry_run:
                    continue

                UserAccessWorkspace.objects.create(
                    workspace=workspace,
                    user=share.collaborator,
                    email=share.email.lower(),
                    role=WORKSPACE_ROLES[share.role],
                    invited_by=share.inviter,
                )
        return members, invites

    def _has_access(self, workspace: Workspace, share: UserObjectRole) -> bool:
        if share.collaborator_id:
            return (
                workspace.created_by_id == share.collaborator_id
                or workspace.user_access.filter(user_id=share.collaborator_id).exists()
            )
        return workspace.user_access.filter(
            Q(email__iexact=share.email) | Q(user__email__iexact=share.email)
        ).exists()

    def _workspace_name_for(self, planning_area: PlanningArea) -> str:
        suffix = f" (Planning Area {planning_area.pk})"
        max_base_length = Workspace._meta.get_field("name").max_length - len(suffix)
        base_name = (planning_area.name or "Planning Area")[:max_base_length]
        return f"{base_name}{suffix}"
