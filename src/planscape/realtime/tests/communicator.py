"""
A minimal WebSocket test client on top of asgiref's ApplicationCommunicator.

`channels.testing.WebsocketCommunicator` would do, but importing
`channels.testing` pulls in daphne/Twisted, which the project does not
otherwise need.
"""

import json
from typing import Any, Optional
from unittest import mock
from urllib.parse import unquote, urlparse

from asgiref.testing import ApplicationCommunicator


def keep_test_connection_open(test_case) -> None:
    """
    Call from `setUp` of a `django.test.TestCase` that drives a consumer.

    Channels calls `close_old_connections()` before every dispatch, on
    disconnect and around every `database_sync_to_async` call. Inside a
    `TestCase` transaction that closes the test connection (its autocommit
    state differs from the settings). Channels' own communicator patches it
    per await, which still races with the executor thread; patching for the
    whole test does not.
    """
    patcher = mock.patch("channels.db.close_old_connections", lambda: None)
    patcher.start()
    test_case.addCleanup(patcher.stop)


class WebsocketCommunicator(ApplicationCommunicator):
    def __init__(self, application, path: str, headers=None):
        parsed = urlparse(path)
        self.scope = {
            "type": "websocket",
            "path": unquote(parsed.path),
            "raw_path": parsed.path.encode(),
            "query_string": parsed.query.encode(),
            "headers": headers or [],
            "subprotocols": [],
        }
        super().__init__(application, self.scope)
        self.response_headers = None

    async def connect(self, timeout: float = 1):
        """Returns (accepted, subprotocol) like channels does; when the
        application closes without accepting, returns (False, close_code)."""
        await self.send_input({"type": "websocket.connect"})
        response = await self.receive_output(timeout)
        if response["type"] == "websocket.close":
            return False, response.get("code", 1000)
        assert response["type"] == "websocket.accept", response
        return True, response.get("subprotocol", None)

    async def send_to(self, text_data: Optional[str] = None, bytes_data=None):
        assert bool(text_data) != bool(bytes_data), "one of text or bytes"
        if text_data:
            await self.send_input({"type": "websocket.receive", "text": text_data})
        else:
            await self.send_input({"type": "websocket.receive", "bytes": bytes_data})

    async def send_json_to(self, data: Any):
        await self.send_to(text_data=json.dumps(data))

    async def receive_from(self, timeout: float = 1) -> str:
        response = await self.receive_output(timeout)
        assert response["type"] == "websocket.send", response
        return response["text"]

    async def receive_json_from(self, timeout: float = 1) -> Any:
        return json.loads(await self.receive_from(timeout))

    async def disconnect(self, code: int = 1000, timeout: float = 1):
        await self.send_input({"type": "websocket.disconnect", "code": code})
        await self.wait(timeout)
