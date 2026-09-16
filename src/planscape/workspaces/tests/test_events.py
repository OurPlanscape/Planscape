from unittest import mock

from django.test import TestCase
from planscape.tests.factories import UserFactory

from workspaces.models import WorkspaceRole
from workspaces.services import (
    accept_invite,
    delete_workspace,
    invite_member,
    remove_member,
    update_member_role,
)
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
)


@mock.patch("workspaces.tasks.send_workspace_invitation.delay")
@mock.patch("realtime.events._send")
class WorkspaceEventsTest(TestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.member = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.member, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )

    def published(self, send):
        return [call.args[0] for call in send.call_args_list]

    def test_delete_workspace_publishes_the_id_before_deleting(self, send, _):
        with self.captureOnCommitCallbacks(execute=True):
            delete_workspace(self.owner, self.workspace)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "workspace.workspace.deleted")
        self.assertEqual(event["workspace_id"], self.workspace.pk)
        self.assertEqual(
            event["object"], {"kind": "workspace", "id": self.workspace.pk}
        )
        self.assertEqual(event["data"], {"workspace_id": self.workspace.pk})
        self.assertEqual(event["actor_id"], self.owner.pk)

    def test_remove_member_publishes_the_target_user(self, send, _):
        with self.captureOnCommitCallbacks(execute=True):
            remove_member(self.owner, self.workspace, self.member.pk)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "workspace.member.removed")
        self.assertEqual(event["workspace_id"], self.workspace.pk)
        self.assertEqual(event["data"], {"user_id": self.member.pk})

    def test_leaving_publishes_left(self, send, _):
        with self.captureOnCommitCallbacks(execute=True):
            remove_member(self.member, self.workspace, self.member.pk)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "workspace.member.left")
        self.assertEqual(event["data"], {"user_id": self.member.pk})

    def test_role_change_publishes_the_new_role(self, send, _):
        with self.captureOnCommitCallbacks(execute=True):
            update_member_role(
                self.owner, self.workspace, self.member.pk, WorkspaceRole.COLLABORATOR
            )

        (event,) = self.published(send)
        self.assertEqual(event["type"], "workspace.member.role_changed")
        self.assertEqual(
            event["data"], {"user_id": self.member.pk, "role": "COLLABORATOR"}
        )

    def test_inviting_a_registered_user_publishes_added(self, send, _):
        invitee = UserFactory.create(email="invitee@example.com")

        with self.captureOnCommitCallbacks(execute=True):
            invite_member(
                self.owner, self.workspace, invitee.email, WorkspaceRole.VIEWER
            )

        (event,) = self.published(send)
        self.assertEqual(event["type"], "workspace.member.added")
        self.assertEqual(event["data"], {"user_id": invitee.pk, "role": "VIEWER"})

    def test_inviting_an_unknown_email_publishes_nothing_until_accepted(self, send, _):
        with self.captureOnCommitCallbacks(execute=True):
            invite_member(
                self.owner, self.workspace, "new@example.com", WorkspaceRole.VIEWER
            )
        self.assertEqual(self.published(send), [])

        newcomer = UserFactory.create(email="new@example.com")
        with self.captureOnCommitCallbacks(execute=True):
            accept_invite(newcomer, self.workspace)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "workspace.member.added")
        self.assertEqual(event["data"], {"user_id": newcomer.pk, "role": "VIEWER"})
