from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.security.websocket import OriginValidator
from django.test import TestCase
from planscape.tests.factories import UserFactory
from rest_framework_simplejwt.tokens import AccessToken
from workspaces.models import WorkspaceRole
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
)

from realtime.consumers import (
    CLOSE_FORBIDDEN,
    CLOSE_NOT_FOUND,
    CLOSE_UNAUTHENTICATED,
    CONNECTED_EVENT,
)
from realtime.events import CHANNEL_MESSAGE_TYPE, build_event, workspace_group_name
from realtime.middleware import JWTAuthMiddleware
from realtime.routing import websocket_urlpatterns
from realtime.tests.communicator import (
    WebsocketCommunicator,
    keep_test_connection_open,
)

ORIGIN = b"http://testserver"

application = OriginValidator(
    JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    [ORIGIN.decode()],
)


def cookie_headers(user):
    token = str(AccessToken.for_user(user))
    return [(b"origin", ORIGIN), (b"cookie", f"my-app-auth={token}".encode())]


def bearer_headers(user):
    token = str(AccessToken.for_user(user))
    return [(b"origin", ORIGIN), (b"authorization", f"Bearer {token}".encode())]


def communicator(workspace_id, headers):
    return WebsocketCommunicator(
        application,
        f"/planscape-backend/ws/workspaces/{workspace_id}/",
        headers=headers,
    )


async def close_code(communicator):
    """Consumers accept first and then close with an application code."""
    connected, _ = await communicator.connect()
    assert connected
    message = await communicator.receive_output()
    assert message["type"] == "websocket.close", message
    return message["code"]


async def send_event(workspace_id, event_type, data=None):
    event = build_event(
        workspace_id,
        event_type,
        obj={"kind": "workspace", "id": workspace_id},
        data=data,
    )
    await get_channel_layer().group_send(
        workspace_group_name(workspace_id),
        {"type": CHANNEL_MESSAGE_TYPE, "event": event},
    )
    return event


class WorkspaceConsumerTest(TestCase):
    def setUp(self):
        keep_test_connection_open(self)
        async_to_sync(get_channel_layer().flush)()
        self.owner = UserFactory.create()
        self.viewer = UserFactory.create()
        self.outsider = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        self.other_workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.viewer,
            workspace=self.workspace,
            role=WorkspaceRole.VIEWER,
        )

    async def test_rejects_unknown_origin(self):
        comm = communicator(self.workspace.pk, [(b"origin", b"http://evil.example")])
        connected, _ = await comm.connect()
        self.assertFalse(connected)

    async def test_rejects_missing_origin(self):
        comm = communicator(self.workspace.pk, [])
        connected, _ = await comm.connect()
        self.assertFalse(connected)

    async def test_anonymous_is_closed_with_4401(self):
        comm = communicator(self.workspace.pk, [(b"origin", ORIGIN)])
        try:
            self.assertEqual(await close_code(comm), CLOSE_UNAUTHENTICATED)
        finally:
            await comm.disconnect()

    async def test_bad_token_is_closed_with_4401(self):
        comm = communicator(
            self.workspace.pk,
            [(b"origin", ORIGIN), (b"cookie", b"my-app-auth=not-a-jwt")],
        )
        try:
            self.assertEqual(await close_code(comm), CLOSE_UNAUTHENTICATED)
        finally:
            await comm.disconnect()

    async def test_non_member_is_closed_with_4403(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.outsider))
        try:
            self.assertEqual(await close_code(comm), CLOSE_FORBIDDEN)
        finally:
            await comm.disconnect()

    async def test_unknown_workspace_is_closed_with_4404(self):
        comm = communicator(999_999, cookie_headers(self.owner))
        try:
            self.assertEqual(await close_code(comm), CLOSE_NOT_FOUND)
        finally:
            await comm.disconnect()

    async def test_soft_deleted_workspace_is_closed_with_4404(self):
        await database_sync_to_async(self.workspace.delete)()
        comm = communicator(self.workspace.pk, cookie_headers(self.owner))
        try:
            self.assertEqual(await close_code(comm), CLOSE_NOT_FOUND)
        finally:
            await comm.disconnect()

    async def test_member_gets_hello_with_role(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.viewer))
        try:
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            hello = await comm.receive_json_from()
            self.assertEqual(
                hello,
                {
                    "type": CONNECTED_EVENT,
                    "workspace_id": self.workspace.pk,
                    "role": WorkspaceRole.VIEWER,
                },
            )
        finally:
            await comm.disconnect()

    async def test_creator_is_owner(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.owner))
        try:
            await comm.connect()
            hello = await comm.receive_json_from()
            self.assertEqual(hello["role"], WorkspaceRole.OWNER)
        finally:
            await comm.disconnect()

    async def test_bearer_header_is_accepted(self):
        comm = communicator(self.workspace.pk, bearer_headers(self.viewer))
        try:
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            hello = await comm.receive_json_from()
            self.assertEqual(hello["type"], CONNECTED_EVENT)
        finally:
            await comm.disconnect()

    async def test_ping_pong(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.viewer))
        try:
            await comm.connect()
            await comm.receive_json_from()
            await comm.send_json_to({"type": "ping"})
            self.assertEqual(await comm.receive_json_from(), {"type": "pong"})
        finally:
            await comm.disconnect()

    async def test_garbage_frames_are_ignored(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.viewer))
        try:
            await comm.connect()
            await comm.receive_json_from()
            await comm.send_to(text_data="not json")
            await comm.send_to(bytes_data=b"\x00\x01")
            await comm.send_json_to(["not", "a", "dict"])
            await comm.send_json_to({"type": "ping"})
            self.assertEqual(await comm.receive_json_from(), {"type": "pong"})
        finally:
            await comm.disconnect()

    async def test_receives_events_for_its_workspace_only(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.viewer))
        try:
            await comm.connect()
            await comm.receive_json_from()

            await send_event(self.other_workspace.pk, "planning.planning_area.created")
            expected = await send_event(
                self.workspace.pk, "planning.planning_area.created"
            )

            received = await comm.receive_json_from()
            self.assertEqual(received, expected)
            self.assertTrue(await comm.receive_nothing())
        finally:
            await comm.disconnect()

    async def test_removed_member_gets_the_event_then_is_closed(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.viewer))
        try:
            await comm.connect()
            await comm.receive_json_from()

            await send_event(
                self.workspace.pk,
                "workspace.member.removed",
                data={"user_id": self.viewer.pk},
            )

            received = await comm.receive_json_from()
            self.assertEqual(received["type"], "workspace.member.removed")
            closed = await comm.receive_output()
            self.assertEqual(closed["type"], "websocket.close")
            self.assertEqual(closed["code"], CLOSE_FORBIDDEN)
        finally:
            await comm.disconnect()

    async def test_other_members_removal_keeps_the_socket_open(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.owner))
        try:
            await comm.connect()
            await comm.receive_json_from()

            await send_event(
                self.workspace.pk,
                "workspace.member.removed",
                data={"user_id": self.viewer.pk},
            )

            received = await comm.receive_json_from()
            self.assertEqual(received["type"], "workspace.member.removed")
            self.assertTrue(await comm.receive_nothing())
        finally:
            await comm.disconnect()

    async def test_workspace_deleted_carries_the_id_and_closes(self):
        comm = communicator(self.workspace.pk, cookie_headers(self.owner))
        try:
            await comm.connect()
            await comm.receive_json_from()

            await send_event(
                self.workspace.pk,
                "workspace.workspace.deleted",
                data={"workspace_id": self.workspace.pk},
            )

            received = await comm.receive_json_from()
            self.assertEqual(received["type"], "workspace.workspace.deleted")
            self.assertEqual(received["workspace_id"], self.workspace.pk)
            self.assertEqual(received["data"]["workspace_id"], self.workspace.pk)
            closed = await comm.receive_output()
            self.assertEqual(closed["code"], CLOSE_FORBIDDEN)
        finally:
            await comm.disconnect()
