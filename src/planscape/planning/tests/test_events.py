from pathlib import Path
from unittest import mock

from django.test import TestCase
from workspaces.tests.factories import PlanningWorkspaceFactory

from planning.models import GeoPackageStatus, PlanningAreaMapStatus
from planning.services import export_to_geopackage
from planning.tasks import async_mark_scenario_panic, async_set_planning_area_status
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory


@mock.patch("realtime.events._send")
class PlanningEventsTest(TestCase):
    def setUp(self):
        self.workspace = PlanningWorkspaceFactory.create()
        self.planning_area = PlanningAreaFactory.create(
            workspace=self.workspace,
            map_status=PlanningAreaMapStatus.PENDING,
        )

    def published(self, send):
        return [call.args[0] for call in send.call_args_list]

    def test_map_status_change_is_published_after_commit(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            async_set_planning_area_status(
                self.planning_area.pk, PlanningAreaMapStatus.STANDS_DONE
            )

        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.planning_area.map_status_changed")
        self.assertEqual(event["workspace_id"], self.workspace.pk)
        self.assertEqual(
            event["object"], {"kind": "planning_area", "id": self.planning_area.pk}
        )
        self.assertEqual(event["data"]["map_status"], "STANDS_DONE")
        self.assertIsNotNone(event["data"]["stands_ready_at"])

    def test_unchanged_map_status_publishes_nothing(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            async_set_planning_area_status(
                self.planning_area.pk, PlanningAreaMapStatus.PENDING
            )

        self.assertEqual(self.published(send), [])

    def test_legacy_planning_area_without_workspace_is_silent(self, send):
        legacy = PlanningAreaFactory.create(map_status=PlanningAreaMapStatus.PENDING)

        with self.captureOnCommitCallbacks(execute=True):
            async_set_planning_area_status(legacy.pk, PlanningAreaMapStatus.DONE)

        self.assertEqual(self.published(send), [])

    def test_scenario_panic_is_published(self, send):
        scenario = ScenarioFactory.create(planning_area=self.planning_area)

        with self.captureOnCommitCallbacks(execute=True):
            async_mark_scenario_panic(scenario.pk)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.status_changed")
        self.assertEqual(event["workspace_id"], self.workspace.pk)
        self.assertEqual(
            event["object"],
            {
                "kind": "scenario",
                "id": scenario.pk,
                "planning_area_id": self.planning_area.pk,
            },
        )
        self.assertEqual(event["data"]["result_status"], "PANIC")

    @mock.patch("planning.services.export_treatable_area_to_geopackage")
    @mock.patch("planning.services.export_scenario_inputs_to_geopackage")
    @mock.patch("planning.services.upload_file_via_cli")
    @mock.patch(
        "planning.services.export_planning_area_to_geopackage",
        side_effect=lambda planning_area, path: Path(path).touch(),
    )
    def test_geopackage_export_publishes_processing_then_succeeded(
        self, _planning_area, _upload, _inputs, _treatable, send
    ):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            geopackage_status=GeoPackageStatus.PENDING,
        )

        with self.captureOnCommitCallbacks(execute=True):
            export_to_geopackage(scenario)

        events = self.published(send)
        self.assertEqual(
            [event["type"] for event in events],
            ["planning.scenario.geopackage_status_changed"] * 2,
        )
        self.assertEqual(events[0]["data"]["geopackage_status"], "PROCESSING")
        self.assertEqual(events[1]["data"]["geopackage_status"], "SUCCEEDED")
        self.assertTrue(events[1]["data"]["geopackage_url"].startswith("gs://"))
