from pathlib import Path
from unittest import mock

from django.urls import reverse
from rest_framework.test import APITestCase
from workspaces.tests.factories import PlanningWorkspaceFactory

from planning.models import (
    GeoPackageStatus,
    PlanningAreaMapStatus,
    ScenarioResultStatus,
)
from planning.services import (
    clone_scenario,
    delete_planning_area,
    delete_scenario,
    export_to_geopackage,
)
from planning.tasks import async_mark_scenario_panic, async_set_planning_area_status
from planning.tests.factories import (
    PlanningAreaFactory,
    ScenarioFactory,
    ScenarioResultFactory,
    TreatmentGoalFactory,
)


@mock.patch("realtime.events._send")
class PlanningEventsTest(APITestCase):
    def setUp(self):
        self.workspace = PlanningWorkspaceFactory.create()
        self.planning_area = PlanningAreaFactory.create(
            workspace=self.workspace,
            map_status=PlanningAreaMapStatus.PENDING,
        )
        self.user = self.planning_area.user

    def published(self, send):
        return [call.args[0] for call in send.call_args_list]

    def test_map_status_change_sends_the_planning_area(self, send):
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
        self.assertEqual(event["data"]["id"], self.planning_area.pk)
        self.assertEqual(event["data"]["name"], self.planning_area.name)
        self.assertEqual(event["data"]["map_status"], "STANDS_DONE")
        # filled in per connection by the socket
        self.assertNotIn("role", event["data"])
        self.assertNotIn("permissions", event["data"])
        self.assertNotIn("geometry", event["data"])

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

    def test_rename_sends_updated(self, send):
        self.client.force_authenticate(self.user)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                reverse(
                    "api:planning:planningareas-detail",
                    args=[self.planning_area.pk],
                ),
                {"name": "Renamed"},
                format="json",
            )

        self.assertEqual(response.status_code, 200, response.content)
        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.planning_area.updated")
        self.assertEqual(event["data"]["name"], "Renamed")
        self.assertEqual(event["actor_id"], self.user.pk)

    def test_planning_area_deleted_sends_only_the_id(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            delete_planning_area(user=self.user, planning_area=self.planning_area)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.planning_area.deleted")
        self.assertEqual(
            event["object"], {"kind": "planning_area", "id": self.planning_area.pk}
        )
        self.assertEqual(event["data"], {})

    def test_scenario_panic_sends_the_scenario(self, send):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area, with_scenario_result=True
        )

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
        self.assertEqual(event["data"]["id"], scenario.pk)
        self.assertEqual(event["data"]["name"], scenario.name)
        self.assertEqual(event["data"]["scenario_result"]["status"], "PANIC")

    def test_scenario_result_geojson_is_stripped(self, send):
        scenario = ScenarioFactory.create(planning_area=self.planning_area)
        ScenarioResultFactory.create(
            scenario=scenario,
            status=ScenarioResultStatus.SUCCESS,
            result={"type": "FeatureCollection", "features": [{"properties": {}}]},
        )

        with self.captureOnCommitCallbacks(execute=True):
            async_mark_scenario_panic(scenario.pk)

        (event,) = self.published(send)
        self.assertIsNone(event["data"]["scenario_result"]["result"])

    @mock.patch(
        "planning.models.create_download_url",
        return_value="http://example.com/download",
    )
    @mock.patch("planning.services.export_treatable_area_to_geopackage")
    @mock.patch("planning.services.export_scenario_inputs_to_geopackage")
    @mock.patch("planning.services.upload_file_via_cli")
    @mock.patch(
        "planning.services.export_planning_area_to_geopackage",
        side_effect=lambda planning_area, path: Path(path).touch(),
    )
    def test_geopackage_export_publishes_status_changes(
        self, _planning_area, _upload, _inputs, _treatable, _download_url, send
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
        # serialized once the transaction commits, so both carry the final state
        self.assertEqual(events[-1]["data"]["geopackage_status"], "SUCCEEDED")
        self.assertEqual(
            events[-1]["data"]["geopackage_url"], "http://example.com/download"
        )

    @mock.patch("planning.views_v2.async_generate_scenario_geopackage")
    @mock.patch("planning.views_v2.track_event")
    def test_geopackage_download_request_sends_pending(self, _track, _task, send):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.user, geopackage_status=None
        )
        self.client.force_authenticate(self.user)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.get(
                reverse(
                    "api:planning:scenarios-download-geopackage", args=[scenario.pk]
                )
            )

        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.geopackage_status_changed")
        self.assertEqual(event["data"]["geopackage_status"], "PENDING")

    def test_clone_sends_the_new_scenario(self, send):
        scenario = ScenarioFactory.create(planning_area=self.planning_area)

        with self.captureOnCommitCallbacks(execute=True):
            clone = clone_scenario(scenario.pk, scenario.user)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.created")
        self.assertEqual(event["workspace_id"], self.workspace.pk)
        self.assertEqual(event["object"]["id"], clone.pk)
        self.assertEqual(event["data"]["id"], clone.pk)
        self.assertEqual(event["data"]["name"], clone.name)
        self.assertEqual(event["actor_id"], scenario.user.pk)

    def test_draft_created_carries_the_draft_status(self, send):
        self.client.force_authenticate(self.user)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("api:planning:scenarios-create-draft"),
                {
                    "name": "draft",
                    "planning_area": self.planning_area.pk,
                    "type": "PRESET",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201, response.content)
        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.created")
        self.assertEqual(event["data"]["scenario_result"]["status"], "DRAFT")

    def test_scenario_patch_sends_updated(self, send):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.user
        )
        self.client.force_authenticate(self.user)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                reverse("api:planning:scenarios-detail", args=[scenario.pk]),
                {"name": "Renamed scenario"},
                format="json",
            )

        self.assertEqual(response.status_code, 200, response.content)
        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.updated")
        self.assertEqual(event["data"]["name"], "Renamed scenario")
        self.assertEqual(event["actor_id"], self.user.pk)

    def test_scenario_draft_patch_sends_updated(self, send):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.user
        )
        treatment_goal = TreatmentGoalFactory.create()
        self.client.force_authenticate(self.user)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                reverse("api:planning:scenarios-patch-draft", args=[scenario.pk]),
                {"treatment_goal": treatment_goal.pk},
                format="json",
            )

        self.assertEqual(response.status_code, 200, response.content)
        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.updated")
        self.assertEqual(event["data"]["treatment_goal"]["id"], treatment_goal.pk)

    def test_scenario_deleted_sends_only_the_ids(self, send):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.user
        )

        with self.captureOnCommitCallbacks(execute=True):
            delete_scenario(user=self.user, scenario=scenario)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "planning.scenario.deleted")
        self.assertEqual(
            event["object"],
            {
                "kind": "scenario",
                "id": scenario.pk,
                "planning_area_id": self.planning_area.pk,
            },
        )
        self.assertEqual(event["data"], {})
