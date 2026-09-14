from django.core import mail
from django.test import TestCase
from planscape.tests.factories import UserFactory
from utils.frontend import get_frontend_url

from workspaces.models import UserAccessWorkspace, WorkspaceRole
from workspaces.tasks import send_workspace_invitation
from workspaces.tests.factories import PlanningWorkspaceFactory


class SendWorkspaceInvitationTest(TestCase):
    def setUp(self):
        self.owner = UserFactory.create(first_name="Han", last_name="Solo")
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        self.invite = UserAccessWorkspace.objects.create(
            workspace=self.workspace,
            email="invitee@example.com",
            role=WorkspaceRole.VIEWER,
            invited_by=self.owner,
        )

    def test_links_open_the_accept_invite_page(self):
        send_workspace_invitation(self.invite.pk, "Welcome aboard")

        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        html, _mimetype = email.alternatives[0]
        accept_invite_path = f"workspace/{self.workspace.pk}/accept"
        workspace_link = get_frontend_url(accept_invite_path)
        create_account_link = get_frontend_url(
            "signup",
            query_params={"redirect": accept_invite_path},
        )
        for content in (email.body, html):
            self.assertIn(workspace_link, content)
            self.assertIn(create_account_link, content)
