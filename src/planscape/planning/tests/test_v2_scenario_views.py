import copy
from unittest import mock

from datasets.models import DataLayerType, GeometryType
from datasets.tests.factories import DataLayerFactory
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APITransactionTestCase

from planning.models import Scenario, ScenarioResult, ScenarioVersion
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
    ScenarioResultFactory,
    TreatmentGoalFactory,
)
from planscape.tests.factories import UserFactory


class CreateScenarioTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory()
        self.planning_area = PlanningAreaFactory(user=self.user)
        self.treatment_goal = TreatmentGoalFactory.create()
        self.configuration = {
            "question_id": self.treatment_goal.pk,
            "weights": [],
            "est_cost": 2000,
            "max_budget": None,
            "max_slope": None,
            "min_distance_from_road": None,
            "stand_size": "LARGE",
            "excluded_areas": [],
            "stand_thresholds": [],
            "global_thresholds": [],
            "scenario_priorities": ["prio1"],
            "scenario_output_fields": ["out1"],
            "max_treatment_area_ratio": 40000,
        }

    @mock.patch("planning.services.chord", autospec=True)
    def test_create_with_explicit_treatment_goal(self, chord_mock):
        configuration = self.configuration.copy()
        configuration.pop("question_id")
        payload = {
            "name": "my dear scenario",
            "planning_area": self.planning_area.pk,
            "stand_size": "LARGE",
            "treatment_goal": self.treatment_goal.pk,
            "configuration": configuration,
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.json().get("id"))
        self.assertEqual(chord_mock.call_count, 1)
        self.assertEqual(1, Scenario.objects.count())
        scenario = Scenario.objects.get()
        self.assertEqual(scenario.treatment_goal, self.treatment_goal)

    def test_create_with_invalid_treatment_goal(self):
        # treatment goal set on configuration
        payload = {
            "name": "my dear scenario",
            "planning_area": self.planning_area.pk,
            "stand_size": "LARGE",
            "treatment_goal": 123456789,
            "configuration": {
                "max_budget": 2000,
            },
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            b'{"treatment_goal":["Invalid pk \\"123456789\\" - object does not exist."]}',
            response.content,
        )

    def test_create_with_invalid_treatment_goal_on_configuration(self):
        # treatment goal set on configuration
        payload = {
            "name": "my dear scenario",
            "planning_area": self.planning_area.pk,
            "stand_size": "LARGE",
            "configuration": {
                "question_id": 123456789,
                "max_budget": 2000,
            },
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            b'{"treatment_goal":["This field is required."]}',
            response.content,
        )

    def test_create_wihtout_treatment_goal(self):
        # treatment goal set on configuration
        payload = {
            "name": "my dear scenario",
            "planning_area": self.planning_area.pk,
            "stand_size": "LARGE",
            "configuration": {
                "max_budget": 2000,
            },
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            b'{"treatment_goal":["This field is required."]}',
            response.content,
        )

    def test_create_without_max_budged_or_area(self):
        self.client.force_authenticate(self.user)
        data = {
            "planning_area": self.planning_area.pk,
            "name": "Hello Scenario!",
            "origin": "SYSTEM",
            "configuration": {},
        }
        response = self.client.post(
            reverse("api:planning:scenarios-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_v2_serializer(self):
        excluded_areas = DataLayerFactory.create_batch(
            2, type=DataLayerType.VECTOR, geometry_type=GeometryType.POLYGON
        )
        excluded_areas = [excluded_areas[0].pk, excluded_areas[1].pk]
        # treatment goal set on configuration
        payload = {
            "name": "V2 scenario",
            "planning_area": self.planning_area.pk,
            "treatment_goal": self.treatment_goal.pk,
            "configuration": {
                "stand_size": "LARGE",
                "est_cost": 2000,
                "excluded_areas": excluded_areas,
            },
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.json()
        self.assertIsNotNone(response_data.get("id"))
        self.assertEqual(1, Scenario.objects.count())
        scenario = Scenario.objects.get()
        self.assertEqual(scenario.planning_area, self.planning_area)
        self.assertEqual(scenario.configuration["excluded_areas_ids"], excluded_areas)
        self.assertEqual(
            response_data.get("configuration").get("excluded_areas"), excluded_areas
        )

    def test_create_v2_serializer__invalid_excluded_area(self):
        invalid_excluded_areas = DataLayerFactory.create_batch(
            2, type=DataLayerType.RASTER, geometry_type=GeometryType.RASTER
        )
        invalid_excluded_areas = [
            invalid_excluded_areas[0].pk,
            invalid_excluded_areas[1].pk,
        ]
        # treatment goal set on configuration
        payload = {
            "name": "V2 scenario",
            "planning_area": self.planning_area.pk,
            "treatment_goal": self.treatment_goal.pk,
            "configuration": {
                "stand_size": "LARGE",
                "est_cost": 2000,
                "excluded_areas": invalid_excluded_areas,
            },
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListScenariosForPlanningAreaTest(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory.create()
        self.owner_user2 = UserFactory.create(username="test_user2")
        self.collab_user = UserFactory.create(username="collab_user")
        self.viewer_user = UserFactory.create(username="viewer_user")
        self.unprivileged_user = UserFactory.create(username="guest")

        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user,
            name="test plan",
            collaborators=[self.collab_user],
            viewers=[self.viewer_user],
        )

        self.empty_planning_area = PlanningAreaFactory.create(
            user=self.owner_user,
            name="empty test plan",
        )

        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan2"
        )

        self.configuration = {
            "question_id": 1,
            "weights": [],
            "est_cost": 2000,
            "max_budget": None,
            "max_slope": None,
            "min_distance_from_road": None,
            "stand_size": "LARGE",
            "excluded_areas": [],
            "stand_thresholds": [],
            "global_thresholds": [],
            "scenario_priorities": ["prio1"],
            "scenario_output_fields": ["out1"],
            "max_treatment_area_ratio": 40000,
        }
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            name="test scenario",
            configuration=self.configuration,
            user=self.owner_user,
        )
        self.scenario_res = ScenarioResultFactory(scenario=self.scenario)
        self.scenario2 = ScenarioFactory.create(
            planning_area=self.planning_area,
            name="test scenario2",
            configuration=self.configuration,
            user=self.owner_user,
        )
        _project_areas = ProjectAreaFactory.create_batch(
            size=10, scenario=self.scenario
        )
        self.scenario_res = ScenarioResultFactory(scenario=self.scenario2)
        self.scenario3 = ScenarioFactory.create(
            planning_area=self.planning_area,
            name="test scenario3",
            configuration=self.configuration,
            user=self.owner_user,
        )
        self.scenario_res = ScenarioResultFactory(scenario=self.scenario3)

        self.owner_user2scenario = ScenarioFactory.create(
            planning_area=self.planning_area2,
            name="test user2scenario",
            user=self.owner_user2,
        )
        self.scenario_res = ScenarioResultFactory(scenario=self.owner_user2scenario)

        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_retrieve_scenario_shared_plan(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-detail",
                kwargs={
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("id"), self.scenario.id)

    def test_list_scenario(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 3)
        self.assertIsNotNone(scenarios[0]["created_at"])
        self.assertIsNotNone(scenarios[0]["updated_at"])

    def test_toggle_scenario_status(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.post(
            reverse(
                "api:planning:scenarios-toggle-status",
                kwargs={
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        scenario = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(scenario.get("status"), "ARCHIVED")

        # toggle back!
        response = self.client.post(
            reverse(
                "api:planning:scenarios-toggle-status",
                kwargs={
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        scenario = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(scenario.get("status"), "ACTIVE")

    def test_list_scenario_not_logged_in(self):
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    def test_list_scenario_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            content_type="application/json",
        )
        # changed because this is filtered
        self.assertEqual(response.status_code, 200)
        data = response.json()
        ids = [record.get("id") for record in data]
        self.assertNotIn(self.owner_user2scenario.pk, ids)

    def test_list_scenario_collab_user(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 3)
        self.assertIsNotNone(scenarios[0]["created_at"])
        self.assertIsNotNone(scenarios[0]["updated_at"])

    def test_list_scenario_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 3)
        self.assertIsNotNone(scenarios[0]["created_at"])
        self.assertIsNotNone(scenarios[0]["updated_at"])

    def test_list_scenario_unprivileged_user_returns_zero_results(self):
        self.client.force_authenticate(self.unprivileged_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 0)

    def test_sort_scenario_by_reverse_acres(self):
        for acres in range(100, 105):
            budget_conf = copy.copy(self.configuration)
            budget_conf["max_treatment_area_ratio"] = acres
            ScenarioFactory.create(
                planning_area=self.planning_area,
                name=f"scenario {acres}",
                configuration=budget_conf,
                user=self.owner_user,
            )
        self.client.force_authenticate(self.owner_user)

        query_params = {"ordering": "-acres"}
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            query_params,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        expected_acres_order = [40000, 40000, 40000, 104, 103, 102, 101, 100]
        budget_results = [s["max_treatment_area"] for s in response_data]
        self.assertEquals(budget_results, expected_acres_order)

    def test_sort_scenario_by_reverse_budget(self):
        for b in range(100, 105):
            budget_conf = copy.copy(self.configuration)
            budget_conf["max_budget"] = b
            ScenarioFactory.create(
                planning_area=self.planning_area,
                name=f"scenario {b}",
                configuration=budget_conf,
                user=self.owner_user,
            )

        self.client.force_authenticate(self.owner_user)
        query_params = {"ordering": "-budget", "planning_area": self.planning_area.pk}
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            query_params,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        expected_budget_order = [104, 103, 102, 101, 100, None, None, None]
        budget_results = [s["max_budget"] for s in response_data]
        self.assertEquals(budget_results, expected_budget_order)

    def test_sort_scenario_by_multiple_fields(self):
        for a in range(1, 4):
            for b in range(100, 104):
                for n in ["aaaa", "bbbb", "cccc"]:
                    budget_conf = copy.copy(self.configuration)
                    budget_conf["max_budget"] = b
                    budget_conf["max_treatment_area_ratio"] = a
                    ScenarioFactory.create(
                        planning_area=self.planning_area,
                        name=f"{n} scenario,a{a}-b{b}",
                        configuration=budget_conf,
                        user=self.owner_user,
                    )
        self.client.force_authenticate(self.owner_user)

        # sort by rev budget, then acres, then name
        query_params = {"ordering": "-budget,acres,-name"}
        response = self.client.get(
            reverse(
                "api:planning:scenarios-list",
            ),
            query_params,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()

        expected_names = [
            "cccc scenario,a1-b103",
            "bbbb scenario,a1-b103",
            "aaaa scenario,a1-b103",
            "cccc scenario,a2-b103",
            "bbbb scenario,a2-b103",
            "aaaa scenario,a2-b103",
            "cccc scenario,a3-b103",
            "bbbb scenario,a3-b103",
            "aaaa scenario,a3-b103",
            "cccc scenario,a1-b102",
            "bbbb scenario,a1-b102",
            "aaaa scenario,a1-b102",
            "cccc scenario,a2-b102",
            "bbbb scenario,a2-b102",
            "aaaa scenario,a2-b102",
            "cccc scenario,a3-b102",
            "bbbb scenario,a3-b102",
            "aaaa scenario,a3-b102",
            "cccc scenario,a1-b101",
            "bbbb scenario,a1-b101",
            "aaaa scenario,a1-b101",
            "cccc scenario,a2-b101",
            "bbbb scenario,a2-b101",
            "aaaa scenario,a2-b101",
            "cccc scenario,a3-b101",
            "bbbb scenario,a3-b101",
            "aaaa scenario,a3-b101",
            "cccc scenario,a1-b100",
            "bbbb scenario,a1-b100",
            "aaaa scenario,a1-b100",
            "cccc scenario,a2-b100",
            "bbbb scenario,a2-b100",
            "aaaa scenario,a2-b100",
            "cccc scenario,a3-b100",
            "bbbb scenario,a3-b100",
            "aaaa scenario,a3-b100",
            # these initial records have None for budget and acres
            "test scenario3",
            "test scenario2",
            "test scenario",
        ]
        name_results = [s["name"] for s in response_data]
        self.assertEquals(expected_names, name_results)

    def test_filter_by_planning_area_returns_filtered_records(self):
        planning_area = PlanningAreaFactory.create()
        planning_area2 = PlanningAreaFactory.create(user=planning_area.user)
        s1 = ScenarioFactory.create(planning_area=planning_area)
        s2 = ScenarioFactory.create(planning_area=planning_area)
        s3 = ScenarioFactory.create(planning_area=planning_area2)
        s4 = ScenarioFactory.create(planning_area=planning_area2)
        self.client.force_authenticate(planning_area.user)

        query_params = {"planning_area": planning_area.pk}
        response = self.client.get(
            reverse("api:planning:scenarios-list"),
            query_params,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        names = [r.get("name") for r in data]
        self.assertIn(s1.name, names)
        self.assertIn(s2.name, names)
        self.assertNotIn(s3.name, names)
        self.assertNotIn(s4.name, names)

    def test_scenario_version(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "api:planning:scenarios-detail",
                kwargs={
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("version"), ScenarioVersion.V1)

        configuration = self.scenario.configuration.copy()
        configuration.pop("question_id")
        self.scenario.configuration = configuration
        self.scenario.save()

        response = self.client.get(
            reverse(
                "api:planning:scenarios-detail",
                kwargs={
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("version"), ScenarioVersion.V2)
