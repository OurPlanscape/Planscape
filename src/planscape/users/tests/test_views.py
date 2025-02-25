from django.urls import reverse
from rest_framework.test import APITransactionTestCase

from collaboration.models import Permissions, Role, UserObjectRole
from planscape.tests.factories import UserFactory
from planning.tests.factories import (
    ScenarioFactory,
    ProjectAreaFactory,
    PlanningAreaFactory,
)
from impacts.tests.factories import TreatmentPlanFactory


class ValidateMartinRequestTestCase(APITransactionTestCase):
    def setUp(self):
        Permissions.objects.get_or_create(role=Role.OWNER, permission="view_scenario")
        Permissions.objects.get_or_create(
            role=Role.COLLABORATOR, permission="view_scenario"
        )
        Permissions.objects.get_or_create(role=Role.VIEWER, permission="view_scenario")
        self.owner = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.viewer = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner,
            owners=[self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.owner
        )
        self.project_area = ProjectAreaFactory.create(scenario=self.scenario)
        self.treatment_plan = TreatmentPlanFactory.create(scenario=self.scenario)
        self.url = reverse("users:validate-martin-request")

    def test_user_has_permission__no_queryparams(self):
        some_user = UserFactory.create()
        self.client.force_authenticate(some_user)
        response = self.client.get(
            self.url, headers={"X_ORIGINAL_URI": "/path/to/martin"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_owner_has_permission__scenario(self):
        self.client.force_authenticate(self.owner)
        martins_path = f"/path/to/martin?scenario_id={self.scenario.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_owner_has_permission__project_area(self):
        self.client.force_authenticate(self.owner)
        martins_path = f"/path/to/martin?project_area_id={self.project_area.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_owner_has_permission__tx_plan(self):
        self.client.force_authenticate(self.owner)
        martins_path = f"/path/to/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_collaborator_has_permission__scenario(self):
        self.client.force_authenticate(self.collaborator)
        martins_path = f"/path/to/martin?scenario_id={self.scenario.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_collaborator_has_permission__project_area(self):
        self.client.force_authenticate(self.collaborator)
        martins_path = f"/path/to/martin?project_area_id={self.project_area.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_collaborator_has_permission__tx_plan(self):
        self.client.force_authenticate(self.collaborator)
        martins_path = f"/path/to/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_viewer_has_permission__scenario(self):
        self.client.force_authenticate(self.viewer)
        martins_path = f"/path/to/martin?scenario_id={self.scenario.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_viewer_has_permission__project_area(self):
        self.client.force_authenticate(self.viewer)
        martins_path = f"/path/to/martin?project_area_id={self.project_area.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_viewer_has_permission__tx_plan(self):
        self.client.force_authenticate(self.viewer)
        martins_path = f"/path/to/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_user_has_no_permission__scenario(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = f"/path/to/martin?scenario_id={self.scenario.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(), {"error": "User does not have permission to view scenario"}
        )

    def test_user_has_no_permission__project_area(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = f"/path/to/martin?project_area_id={self.project_area.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(),
            {
                "error": "User does not have permission to view scenario of given project area"
            },
        )

    def test_user_has_no_permission__tx_plan(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = f"/path/to/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(),
            {
                "error": "User does not have permission to view scenario of given treatment plan"
            },
        )

    def test_unauthenticated_user(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_missing_headers(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "X-Original-URI header not found"})
