from django.test import TestCase
from planscape.tests.factories import UserFactory

from workspaces.models import UserAccessWorkspace, WorkspaceRole
from workspaces.permissions import WorkspacePermission
from workspaces.services import accept_pending_invites
from workspaces.tests.factories import PlanningWorkspaceFactory


class AcceptPendingInvitesTest(TestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        self.other_workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        for workspace in (self.workspace, self.other_workspace):
            UserAccessWorkspace.objects.create(
                workspace=workspace,
                email="invitee@example.com",
                role=WorkspaceRole.VIEWER,
                invited_by=self.owner,
            )
        self.unrelated_invite = UserAccessWorkspace.objects.create(
            workspace=self.workspace,
            email="someone-else@example.com",
            role=WorkspaceRole.VIEWER,
            invited_by=self.owner,
        )

    def test_accepts_every_invite_sent_to_the_user_email(self):
        user = UserFactory.create(email="Invitee@Example.com")

        accepted = accept_pending_invites(user)

        self.assertEqual(len(accepted), 2)
        self.assertTrue(WorkspacePermission.can_view(user, self.workspace))
        self.assertTrue(WorkspacePermission.can_view(user, self.other_workspace))
        self.unrelated_invite.refresh_from_db()
        self.assertIsNone(self.unrelated_invite.user)

    def test_does_nothing_without_pending_invites(self):
        user = UserFactory.create(email="nobody@example.com")

        self.assertEqual(accept_pending_invites(user), [])
