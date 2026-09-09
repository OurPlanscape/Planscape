from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from planning.tests.factories import PlanningAreaFactory
from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)
from workspaces.tests.factories import PlanningWorkspaceFactory


class MigratePlanningAreaWorkspacesCommandTest(TestCase):
    def test_creates_one_workspace_per_planning_area(self):
        planning_area1 = PlanningAreaFactory.create(name="First Area")
        planning_area2 = PlanningAreaFactory.create(name="Second Area")

        out = StringIO()
        call_command("migrate_planning_area_workspaces", stdout=out)

        planning_area1.refresh_from_db()
        planning_area2.refresh_from_db()

        self.assertIsNotNone(planning_area1.workspace)
        self.assertIsNotNone(planning_area2.workspace)
        self.assertNotEqual(planning_area1.workspace_id, planning_area2.workspace_id)
        self.assertEqual(
            planning_area1.workspace.name,
            f"First Area (Planning Area {planning_area1.pk})",
        )
        self.assertEqual(planning_area1.workspace.kind, WorkspaceKind.PLANNING)
        self.assertEqual(planning_area1.workspace.created_by, planning_area1.user)
        self.assertEqual(
            UserAccessWorkspace.objects.get(
                user=planning_area1.user,
                workspace=planning_area1.workspace,
            ).role,
            WorkspaceRole.OWNER,
        )
        self.assertIn("created=2, skipped=0", out.getvalue())

    def test_skips_planning_areas_that_already_have_workspace(self):
        existing_workspace = PlanningWorkspaceFactory.create()
        planning_area = PlanningAreaFactory.create(workspace=existing_workspace)

        call_command("migrate_planning_area_workspaces")

        planning_area.refresh_from_db()

        self.assertEqual(planning_area.workspace, existing_workspace)
        self.assertEqual(Workspace.objects.count(), 1)

    def test_dry_run_does_not_create_workspaces(self):
        planning_area = PlanningAreaFactory.create()

        out = StringIO()
        call_command("migrate_planning_area_workspaces", dry_run=True, stdout=out)

        planning_area.refresh_from_db()
        self.assertIsNone(planning_area.workspace)
        self.assertEqual(Workspace.objects.count(), 0)
        self.assertIn("[DRY RUN]", out.getvalue())

    def test_can_migrate_single_planning_area(self):
        planning_area1 = PlanningAreaFactory.create()
        planning_area2 = PlanningAreaFactory.create()

        call_command(
            "migrate_planning_area_workspaces",
            planning_area_id=planning_area1.pk,
        )

        planning_area1.refresh_from_db()
        planning_area2.refresh_from_db()
        self.assertIsNotNone(planning_area1.workspace)
        self.assertIsNone(planning_area2.workspace)
