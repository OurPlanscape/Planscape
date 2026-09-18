import logging
from typing import Any, Optional

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from workspaces.access import get_workspace_role
from workspaces.models import Workspace

from realtime.events import workspace_group_name

log = logging.getLogger(__name__)

# Application close codes. The consumer always accepts the socket before
# closing it with one of these; a close before `accept()` turns into a plain
# HTTP 403 handshake failure and the browser only ever sees code 1006.
CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_NOT_FOUND = 4404

CONNECTED_EVENT = "realtime.connected"
WORKSPACE_DELETED_EVENT = "workspace.workspace.deleted"
MEMBERSHIP_REVOKED_EVENTS = ("workspace.member.removed", "workspace.member.left")


@database_sync_to_async
def get_role(user, workspace_id: int) -> Optional[str]:
    """Role of `user` in the workspace, or None. Raises Workspace.DoesNotExist
    for unknown or soft-deleted workspaces."""
    workspace = Workspace.objects.get(pk=workspace_id)
    return get_workspace_role(user, workspace)


class WorkspaceConsumer(AsyncJsonWebsocketConsumer):
    """
    One connection per (client, workspace). Server-to-client only: the client
    may send `{"type": "ping"}` and gets `{"type": "pong"}` back; anything else
    is ignored. Every event published to `workspace.<id>` is forwarded as-is.
    """

    workspace_id: int
    group_name: Optional[str] = None

    async def connect(self):
        await self.accept()

        self.workspace_id = int(self.scope["url_route"]["kwargs"]["workspace_id"])
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        try:
            role = await get_role(user, self.workspace_id)
        except Workspace.DoesNotExist:
            await self.close(code=CLOSE_NOT_FOUND)
            return
        if role is None:
            await self.close(code=CLOSE_FORBIDDEN)
            return

        self.group_name = workspace_group_name(self.workspace_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.send_json(
            {
                "type": CONNECTED_EVENT,
                "workspace_id": self.workspace_id,
                "role": str(role),
            }
        )

    async def disconnect(self, code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            self.group_name = None

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        # Malformed or binary frames are ignored instead of tearing the socket down.
        if not text_data:
            return
        try:
            content = await self.decode_json(text_data)
        except ValueError:
            return
        await self.receive_json(content, **kwargs)

    async def receive_json(self, content, **kwargs):
        if isinstance(content, dict) and content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def workspace_event(self, message: dict[str, Any]):
        """Handler for channel-layer messages of type `workspace.event`."""
        event = message["event"]
        await self.send_json(event)
        if self.revokes_access(event):
            await self.close(code=CLOSE_FORBIDDEN)

    def revokes_access(self, event: dict[str, Any]) -> bool:
        event_type = event.get("type")
        if event_type == WORKSPACE_DELETED_EVENT:
            return True
        if event_type in MEMBERSHIP_REVOKED_EVENTS:
            user = self.scope.get("user")
            user_id = (event.get("data") or {}).get("user_id")
            return user is not None and user_id == user.pk
        return False
