from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from collaboration.models import Role
from collaboration.tests.factories import UserObjectRoleFactory
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory
from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)
from workspaces.tests.factories import PlanningWorkspaceFactory


def planning_workspaces():
    # a data catalog workspace named "Default" is created by a migration
    return Workspace.objects.filter(kind=WorkspaceKind.PLANNING)


class MigratePlanningAreaWorkspacesCommandTest(TestCase):
    def _share(self, planning_area, collaborator, role, email=None):
        return UserObjectRoleFactory.create(
            associated_model=planning_area,
            inviter=planning_area.user,
            collaborator=collaborator,
            email=email or collaborator.email,
            role=role,
        )

    def _migrate(self, **options):
        out = StringIO()
        call_command("migrate_planning_area_workspaces", stdout=out, **options)
        return out.getvalue()

    def test_unshared_planning_areas_move_to_their_creators_default_workspace(self):
        user = UserFactory.create()
        other_user = UserFactory.create()
        planning_area1 = PlanningAreaFactory.create(user=user)
        planning_area2 = PlanningAreaFactory.create(user=user)
        other_planning_area = PlanningAreaFactory.create(user=other_user)

        output = self._migrate()

        for planning_area in (planning_area1, planning_area2, other_planning_area):
            planning_area.refresh_from_db()
        workspace = planning_area1.workspace
        self.assertEqual(workspace.name, "Default")
        self.assertEqual(workspace.kind, WorkspaceKind.PLANNING)
        self.assertEqual(workspace.created_by, user)
        self.assertEqual(planning_area2.workspace, workspace)
        self.assertEqual(
            UserAccessWorkspace.objects.get(user=user, workspace=workspace).role,
            WorkspaceRole.OWNER,
        )
        self.assertEqual(other_planning_area.workspace.name, "Default")
        self.assertEqual(other_planning_area.workspace.created_by, other_user)
        self.assertIn("created=0, defaults=2, moved=3", output)

    def test_reuses_an_existing_default_workspace(self):
        user = UserFactory.create()
        default_workspace = PlanningWorkspaceFactory.create(
            created_by=user, name="Default"
        )
        planning_area = PlanningAreaFactory.create(user=user)

        self._migrate()

        planning_area.refresh_from_db()
        self.assertEqual(planning_area.workspace, default_workspace)
        self.assertEqual(planning_workspaces().count(), 1)

    def test_shared_planning_areas_get_their_own_workspace(self):
        planning_area = PlanningAreaFactory.create(name="Shared Area")
        collaborator = UserFactory.create()
        self._share(planning_area, collaborator, Role.COLLABORATOR)
        self._share(planning_area, None, Role.VIEWER, email="Pending@Example.com")

        output = self._migrate()

        planning_area.refresh_from_db()
        workspace = planning_area.workspace
        self.assertEqual(workspace.name, "Shared Area")
        self.assertEqual(workspace.created_by, planning_area.user)
        self.assertEqual(
            UserAccessWorkspace.objects.get(
                user=planning_area.user, workspace=workspace
            ).role,
            WorkspaceRole.OWNER,
        )
        member = UserAccessWorkspace.objects.get(workspace=workspace, user=collaborator)
        self.assertEqual(member.role, WorkspaceRole.COLLABORATOR)
        self.assertEqual(member.invited_by, planning_area.user)
        invite = UserAccessWorkspace.objects.get(
            workspace=workspace, email="pending@example.com"
        )
        self.assertIsNone(invite.user)
        self.assertEqual(invite.role, WorkspaceRole.VIEWER)
        self.assertIn("created=1, defaults=0, moved=0", output)
        self.assertIn("members=1, invites=1", output)

    def test_disambiguates_same_named_workspaces_for_the_same_user(self):
        user = UserFactory.create()
        planning_area1 = PlanningAreaFactory.create(user=user, name="Shared Area")
        planning_area2 = PlanningAreaFactory.create(user=user, name="Shared Area")
        for planning_area in (planning_area1, planning_area2):
            self._share(planning_area, UserFactory.create(), Role.COLLABORATOR)

        self._migrate()

        planning_area1.refresh_from_db()
        planning_area2.refresh_from_db()
        names = {planning_area1.workspace.name, planning_area2.workspace.name}
        self.assertEqual(names, {"Shared Area", "Shared Area-1"})

    def test_planning_areas_with_only_pending_shares_count_as_shared(self):
        planning_area = PlanningAreaFactory.create()
        self._share(planning_area, None, Role.VIEWER, email="pending@example.com")

        self._migrate()

        planning_area.refresh_from_db()
        self.assertNotEqual(planning_area.workspace.name, "Default")
        self.assertTrue(
            planning_area.workspace.user_access.filter(
                email="pending@example.com", user__isnull=True
            ).exists()
        )

    def test_skips_planning_areas_that_already_have_workspace(self):
        existing_workspace = PlanningWorkspaceFactory.create()
        planning_area = PlanningAreaFactory.create(workspace=existing_workspace)

        self._migrate()

        planning_area.refresh_from_db()
        self.assertEqual(planning_area.workspace, existing_workspace)
        self.assertEqual(planning_workspaces().count(), 1)

    def test_copies_shares_of_planning_areas_that_already_have_a_workspace(self):
        workspace = PlanningWorkspaceFactory.create()
        planning_area = PlanningAreaFactory.create(
            workspace=workspace, user=workspace.created_by
        )
        collaborator = UserFactory.create()
        self._share(planning_area, collaborator, Role.OWNER)

        self._migrate()

        self.assertEqual(
            UserAccessWorkspace.objects.get(
                workspace=workspace, user=collaborator
            ).role,
            WorkspaceRole.OWNER,
        )

    def test_running_again_changes_nothing(self):
        unshared_planning_area = PlanningAreaFactory.create()
        shared_planning_area = PlanningAreaFactory.create()
        self._share(shared_planning_area, UserFactory.create(), Role.VIEWER)
        self._share(
            shared_planning_area, None, Role.VIEWER, email="pending@example.com"
        )

        self._migrate()
        output = self._migrate()

        shared_planning_area.refresh_from_db()
        # the creator, the collaborator and the pending invite
        self.assertEqual(shared_planning_area.workspace.user_access.count(), 3)
        self.assertEqual(planning_workspaces().count(), 2)
        self.assertIn("created=0, defaults=0, moved=0, skipped=2", output)
        self.assertIn("members=0, invites=0", output)
        unshared_planning_area.refresh_from_db()
        self.assertEqual(unshared_planning_area.workspace.name, "Default")

    def test_dry_run_writes_nothing(self):
        unshared_planning_area = PlanningAreaFactory.create()
        shared_planning_area = PlanningAreaFactory.create()
        self._share(shared_planning_area, UserFactory.create(), Role.VIEWER)

        output = self._migrate(dry_run=True)

        unshared_planning_area.refresh_from_db()
        shared_planning_area.refresh_from_db()
        self.assertIsNone(unshared_planning_area.workspace)
        self.assertIsNone(shared_planning_area.workspace)
        self.assertEqual(planning_workspaces().count(), 0)
        self.assertEqual(
            UserAccessWorkspace.objects.filter(
                workspace__kind=WorkspaceKind.PLANNING
            ).count(),
            0,
        )
        self.assertIn("[DRY RUN]", output)
        self.assertIn("created=1, defaults=1, moved=1", output)
        self.assertIn("members=1, invites=0", output)

    def test_can_migrate_single_planning_area(self):
        planning_area1 = PlanningAreaFactory.create()
        planning_area2 = PlanningAreaFactory.create()

        self._migrate(planning_area_id=planning_area1.pk)

        planning_area1.refresh_from_db()
        planning_area2.refresh_from_db()
        self.assertIsNotNone(planning_area1.workspace)
        self.assertIsNone(planning_area2.workspace)
