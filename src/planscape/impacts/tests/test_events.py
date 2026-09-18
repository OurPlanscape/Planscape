from unittest import mock

from django.test import TestCase
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from workspaces.tests.factories import PlanningWorkspaceFactory

from impacts.models import TreatmentPlanStatus
from impacts.services import clone_treatment_plan, create_treatment_plan
from impacts.tasks import async_set_status


@mock.patch("realtime.events._send")
class TreatmentPlanEventsTest(TestCase):
    def setUp(self):
        self.workspace = PlanningWorkspaceFactory.create()
        self.planning_area = PlanningAreaFactory.create(workspace=self.workspace)
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.user = self.scenario.user

    def published(self, send):
        return [call.args[0] for call in send.call_args_list]

    def test_create_and_clone_publish_created(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            plan = create_treatment_plan(self.scenario, "plan", self.user)
            cloned, _ = clone_treatment_plan(plan, self.user)

        created, cloned_event = self.published(send)
        self.assertEqual(created["type"], "impacts.treatment_plan.created")
        self.assertEqual(created["workspace_id"], self.workspace.pk)
        self.assertEqual(
            created["object"],
            {
                "kind": "treatment_plan",
                "id": plan.pk,
                "scenario_id": self.scenario.pk,
                "planning_area_id": self.planning_area.pk,
            },
        )
        self.assertEqual(created["data"], {"status": "PENDING"})
        self.assertEqual(cloned_event["object"]["id"], cloned.pk)
        self.assertEqual(cloned_event["data"]["cloned_from"], plan.pk)

    def test_status_change_is_published(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            plan = create_treatment_plan(self.scenario, "plan", self.user)
        send.reset_mock()

        with self.captureOnCommitCallbacks(execute=True):
            async_set_status(
                plan.pk, TreatmentPlanStatus.RUNNING, start=True, user_id=self.user.pk
            )

        (event,) = self.published(send)
        self.assertEqual(event["type"], "impacts.treatment_plan.status_changed")
        self.assertEqual(event["object"]["id"], plan.pk)
        self.assertEqual(event["data"], {"status": "RUNNING"})
        self.assertEqual(event["actor_id"], self.user.pk)
