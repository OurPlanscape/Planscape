from datetime import date
from unittest import mock

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.test import TestCase
from planning.models import ScenarioResultStatus

from realtime.events import (
    CHANNEL_MESSAGE_TYPE,
    build_event,
    get_actor_id,
    publish_workspace_event,
    to_plain,
    workspace_group_name,
)


class ToPlainTest(TestCase):
    def test_converts_enums_dates_and_nested_values(self):
        value = to_plain(
            {
                "status": ScenarioResultStatus.RUNNING,
                "when": date(2026, 9, 16),
                "ids": (1, 2),
                "nested": {"ok": True, "none": None},
            }
        )

        self.assertEqual(
            value,
            {
                "status": "RUNNING",
                "when": "2026-09-16",
                "ids": [1, 2],
                "nested": {"ok": True, "none": None},
            },
        )
        self.assertIs(type(value["status"]), str)


class BuildEventTest(TestCase):
    def test_envelope_shape(self):
        event = build_event(
            7,
            "planning.scenario.status_changed",
            obj={"kind": "scenario", "id": 3},
            data={"result_status": ScenarioResultStatus.RUNNING},
            actor_id=9,
        )

        self.assertEqual(event["type"], "planning.scenario.status_changed")
        self.assertEqual(event["workspace_id"], 7)
        self.assertEqual(event["object"], {"kind": "scenario", "id": 3})
        self.assertEqual(event["data"], {"result_status": "RUNNING"})
        self.assertEqual(event["actor_id"], 9)
        self.assertIn("timestamp", event)

    def test_group_name(self):
        self.assertEqual(workspace_group_name(12), "workspace.12")

    def test_actor_id(self):
        self.assertIsNone(get_actor_id(None))
        self.assertEqual(get_actor_id(mock.Mock(pk=4)), 4)


class PublishWorkspaceEventTest(TestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()

    def test_no_workspace_publishes_nothing(self):
        with mock.patch("realtime.events.get_channel_layer") as layer:
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                publish_workspace_event(None, "x.y.z", obj={"kind": "x", "id": 1})

        self.assertEqual(callbacks, [])
        layer.assert_not_called()

    def test_sends_to_the_workspace_group_after_commit(self):
        with mock.patch("realtime.events.get_channel_layer") as get_layer:
            get_layer.return_value.group_send = mock.AsyncMock()
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                publish_workspace_event(
                    5,
                    "planning.planning_area.created",
                    obj={"kind": "planning_area", "id": 1},
                    data={"map_status": "PENDING"},
                    actor_id=2,
                )
                # nothing is sent until the transaction commits
                get_layer.return_value.group_send.assert_not_called()

        self.assertEqual(len(callbacks), 1)
        get_layer.return_value.group_send.assert_awaited_once()
        group, message = get_layer.return_value.group_send.await_args.args
        self.assertEqual(group, "workspace.5")
        self.assertEqual(message["type"], CHANNEL_MESSAGE_TYPE)
        self.assertEqual(message["event"]["type"], "planning.planning_area.created")
        self.assertEqual(message["event"]["workspace_id"], 5)
        self.assertEqual(message["event"]["data"], {"map_status": "PENDING"})
        self.assertEqual(message["event"]["actor_id"], 2)

    def test_reaches_the_in_memory_layer(self):
        layer = get_channel_layer()
        channel = async_to_sync(layer.new_channel)()
        async_to_sync(layer.group_add)("workspace.8", channel)

        with self.captureOnCommitCallbacks(execute=True):
            publish_workspace_event(8, "x.y.z", obj={"kind": "x", "id": 1})

        message = async_to_sync(layer.receive)(channel)
        self.assertEqual(message["type"], CHANNEL_MESSAGE_TYPE)
        self.assertEqual(message["event"]["workspace_id"], 8)

    def test_layer_errors_are_logged_not_raised(self):
        with mock.patch("realtime.events.get_channel_layer") as get_layer:
            get_layer.return_value.group_send = mock.AsyncMock(
                side_effect=RuntimeError("redis down")
            )
            with self.assertLogs("realtime.events", level="ERROR"):
                with self.captureOnCommitCallbacks(execute=True):
                    publish_workspace_event(5, "x.y.z", obj={"kind": "x", "id": 1})
