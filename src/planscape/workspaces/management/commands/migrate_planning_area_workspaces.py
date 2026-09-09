from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from datasets.models import VisibilityOptions
from planning.models import PlanningArea
from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)


class Command(BaseCommand):
    help = "Create one planning workspace per planning area and assign it."

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
        skipped = 0

        if total == 0:
            self.stdout.write("No planning areas matched the given filters.")
            return

        for planning_area in planning_areas.iterator():
            if planning_area.workspace_id:
                skipped += 1
                self.stdout.write(
                    f"[SKIP] PlanningArea {planning_area.pk} already has "
                    f"Workspace {planning_area.workspace_id}."
                )
                continue

            workspace_name = self._workspace_name_for(planning_area)
            if dry_run:
                created += 1
                self.stdout.write(
                    f"[DRY RUN] Would create Workspace '{workspace_name}' for "
                    f"PlanningArea {planning_area.pk}."
                )
                continue

            with transaction.atomic():
                workspace = Workspace.objects.create(
                    name=workspace_name,
                    visibility=VisibilityOptions.PRIVATE,
                    kind=WorkspaceKind.PLANNING,
                    created_by=planning_area.user,
                    creator_name=(
                        planning_area.user.get_full_name()
                        if planning_area.user_id
                        else None
                    ),
                )
                if planning_area.user_id:
                    UserAccessWorkspace.objects.create(
                        user=planning_area.user,
                        workspace=workspace,
                        role=WorkspaceRole.OWNER,
                    )
                planning_area.workspace = workspace
                planning_area.save(update_fields=["workspace"])

            created += 1
            self.stdout.write(
                f"[OK] Created Workspace {workspace.pk} for PlanningArea "
                f"{planning_area.pk}."
            )

        self.stdout.write(
            f"Done. Matched={total}, created={created}, skipped={skipped}."
        )

    def _workspace_name_for(self, planning_area: PlanningArea) -> str:
        suffix = f" (Planning Area {planning_area.pk})"
        max_base_length = Workspace._meta.get_field("name").max_length - len(suffix)
        base_name = (planning_area.name or "Planning Area")[:max_base_length]
        return f"{base_name}{suffix}"
