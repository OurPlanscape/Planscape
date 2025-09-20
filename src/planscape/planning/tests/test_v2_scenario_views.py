import copy
from unittest import mock

from datasets.models import DataLayerType, GeometryType
from datasets.tests.factories import DataLayerFactory
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APITransactionTestCase

from planning.models import (
    Scenario,
    ScenarioCapability,
    ScenarioResult,
    ScenarioVersion,
    TreatmentGoalGroup,
)
from planning.serializers import ListScenarioSerializer, ScenarioV2Serializer
from planning.services import compute_scenario_capabilities
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
    ScenarioResultFactory,
    TreatmentGoalFactory,
    UserFactory,
)


class CreateScenarioTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory()
        self.planning_area = PlanningAreaFactory(user=self.user)
        self.treatment_goal = TreatmentGoalFactory.create()
        self.configuration = {
            "stand_size": "LARGE",
            "included_areas": [],
            "excluded_areas": [],
            "constraints": [],
            "targets": [
                {"name": "max_budget", "operator": "eq", "value": "2000"},
            ],
        }

    @mock.patch("planning.services.chord", autospec=True)
    def test_create_with_explicit_treatment_goal(self, chord_mock):
        configuration = self.configuration.copy()
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
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "2000"},
                ],
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
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "2000"},
                ],
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
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "2000"},
                ],
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
                "excluded_areas": excluded_areas,
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "2000"},
                ],
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
        targets = scenario.configuration.get("targets", [])
        self.assertTrue(any(t["name"] == "max_budget" for t in targets))

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
                "excluded_areas": invalid_excluded_areas,
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "2000"},
                ],
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
            "stand_size": "LARGE",
            "included_areas": [],
            "excluded_areas": [],
            "constraints": [],
            "targets": [
                {"name": "max_area", "operator": "eq", "value": "40000"},
            ],
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
            budget_conf = copy.deepcopy(self.configuration)
            budget_conf["targets"] = [
                {"name": "max_area", "operator": "eq", "value": str(acres)}
            ]
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
            budget_conf = copy.deepcopy(self.configuration)
            budget_conf["targets"] = [
                {"name": "max_budget", "operator": "eq", "value": str(b)}
            ]
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
                    budget_conf["targets"] = [
                        {"name": "max_budget", "operator": "eq", "value": str(b)},
                        {"name": "max_area", "operator": "eq", "value": str(a)},
                    ]
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


class ScenarioDetailTest(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.owner_user)
        self.treatment_goal = TreatmentGoalFactory.create()
        self.configuration = {
            "stand_size": "LARGE",
            "excluded_areas": [],
            "targets": [
                {"name": "max_budget", "operator": "eq", "value": "2000"},
            ],
        }
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            name="test scenario",
            configuration=self.configuration,
            user=self.owner_user,
        )

    @mock.patch(
        "planning.models.create_download_url",
        return_value="http://example.com/download",
    )
    def test_detail_scenario_v2_with_geopackage_url(self, mock_create_download_url):
        self.scenario.geopackage_url = "gs://bucket/path/to/geopackage.gpkg"
        self.scenario.save()

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
        self.assertEqual(data.get("geopackage_url"), "http://example.com/download")

    def test_detail_scenario_v2_without_geopackage_url(self):
        self.scenario.geopackage_url = None
        self.scenario.save()

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
        self.assertIsNone(data.get("geopackage_url"))

    def test_detail_scenario_v2_no_usage_types(self):
        self.scenario.save()
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
        self.assertEqual(data.get("usage_types"), [])

    def test_detail_scenario_v2_with_usage_types(self):
        self.scenario.treatment_goal = TreatmentGoalFactory.create(with_datalayers=True)
        self.scenario.save()

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
        self.assertEqual(len(data.get("usage_types")), 3)
        for entry in data.get("usage_types"):
            self.assertIn("usage_type", entry)
            self.assertIn("datalayer", entry)


class PatchScenarioConfigurationTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()

        self.planning_area = PlanningAreaFactory(user=self.user)
        self.treatment_goal = TreatmentGoalFactory()

        self.scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "2000"},
                ],
            },
        )

        self.url = reverse("api:planning:scenarios-detail", args=[self.scenario.pk])

    def test_patch_scenario_configuration_success(self):
        datalayer = DataLayerFactory.create(
            type=DataLayerType.RASTER,
            geometry_type=GeometryType.RASTER,
        )

        payload = {
            "stand_size": "SMALL",
            "constraints": [
                {
                    "datalayer": datalayer.pk,  # valid DataLayer id for distance-from-road
                    "operator": "eq",
                    "value": "100",
                }
            ],
            "targets": [
                {"name": "max_budget", "operator": "eq", "value": "20000"},
                {"name": "max_project_count", "operator": "eq", "value": "5"},
            ],
        }

        self.client.force_authenticate(self.user)
        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        config = response.data.get("configuration", {})
        self.assertEqual(config.get("stand_size"), "SMALL")

        constraints = config.get("constraints", [])
        self.assertTrue(
            any(
                c["datalayer"] == datalayer.pk
                and c["operator"] == "eq"
                and c["value"] == "100"
                for c in constraints
            )
        )

        targets = config.get("targets", [])
        self.assertIn(
            {"name": "max_budget", "operator": "eq", "value": "20000"},
            targets,
        )
        self.assertIn(
            {"name": "max_project_count", "operator": "eq", "value": "5"},
            targets,
        )

    def test_patch_scenario_configuration_unauthenticated(self):
        payload = {
            "targets": [
                {"name": "max_budget", "operator": "eq", "value": "5000"},
            ],
        }
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_scenario_configuration_forbidden_for_other_user(self):
        scenario = ScenarioFactory(user=self.other_user)
        url = reverse("api:planning:scenarios-detail", args=[scenario.pk])
        payload = {
            "targets": [
                {"name": "max_budget", "operator": "eq", "value": "100000"},
            ],
        }
        # Authenticate as a user who does not own the scenario
        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")

        # Expect 404 since get_object() hides unauthorized scenarios
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_scenario_configuration_invalid_scenario_id(self):
        invalid_url = reverse("api:planning:scenarios-detail", args=[999999])
        self.client.force_authenticate(self.user)
        payload = {
            "targets": [
                {"name": "max_budget", "operator": "eq", "value": "100000"},
            ],
        }
        response = self.client.patch(invalid_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ScenarioCapabilitiesViewTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.tg_conus = TreatmentGoalFactory.create(
            group=TreatmentGoalGroup.WILDFIRE_RISK_TO_COMMUTIES
        )
        self.treatment_goal = TreatmentGoalFactory.create(
            group=TreatmentGoalGroup.CALIFORNIA_PLANNING_METRICS
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.user,
            treatment_goal=self.tg_conus,
            configuration={"stand_size": "LARGE"},
            name="caps-view1",
        )
        self.scenario2 = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.user,
            treatment_goal=self.treatment_goal,
            configuration={"stand_size": "LARGE"},
            name="caps-view2",
        )

    def test_capabilities_present_in_detail_outside_california(self):
        self.scenario.capabilities = compute_scenario_capabilities(self.scenario)
        self.scenario.save(update_fields=["capabilities"])

        self.client.force_authenticate(self.user)
        url = reverse("api:planning:scenarios-detail", args=[self.scenario.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        caps = resp.data.get("capabilities")
        self.assertIsInstance(caps, list)
        self.assertSetEqual(set(caps), {"FORSYS"})

    def test_capabilities_present_in_detail_inside_california(self):
        self.scenario2.capabilities = compute_scenario_capabilities(self.scenario2)
        self.scenario2.save(update_fields=["capabilities"])

        self.client.force_authenticate(self.user)
        url = reverse("api:planning:scenarios-detail", args=[self.scenario2.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        caps = resp.data.get("capabilities")
        self.assertIsInstance(caps, list)
        self.assertSetEqual(set(caps), {"FORSYS", "IMPACTS"})


class ScenarioCapabilitiesSerializerTest(TestCase):
    def test_v2_serializer_includes_capabilities(self):
        s = ScenarioFactory.create()
        s.capabilities = [ScenarioCapability.FORSYS, ScenarioCapability.IMPACTS]
        s.save(update_fields=["capabilities"])

        data = ScenarioV2Serializer(s).data
        self.assertSetEqual(set(data["capabilities"]), {"FORSYS", "IMPACTS"})

    def test_list_serializer_includes_capabilities(self):
        s = ScenarioFactory.create()
        s.capabilities = [ScenarioCapability.FORSYS, ScenarioCapability.IMPACTS]
        s.save(update_fields=["capabilities"])

        data = ListScenarioSerializer(s).data
        self.assertSetEqual(set(data["capabilities"]), {"FORSYS", "IMPACTS"})


class RunScenarioEndpointTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.other_user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.treatment_goal = TreatmentGoalFactory.create()

        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": [
                    {"name": "max_budget", "operator": "eq", "value": "1000"},
                ],
            },
            name="runnable scenario",
        )
        self.url = reverse("api:planning:scenarios-run", args=[self.scenario.pk])

    def test_run_success_returns_202_and_triggers_run(self):
        self.client.force_authenticate(self.user)
        with (
            mock.patch(
                "planning.views_v2.validate_scenario_configuration", return_value=[]
            ) as validate_mock,
            mock.patch("planning.views_v2.trigger_scenario_run") as trigger_mock,
        ):
            response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        trigger_mock.assert_called_once()
        args, _ = trigger_mock.call_args
        self.assertEqual(args[0].pk, self.scenario.pk)
        self.assertEqual(args[1], self.user)

        data = response.json()
        self.assertEqual(data.get("id"), self.scenario.pk)

    def test_run_validation_errors_return_400(self):
        self.client.force_authenticate(self.user)
        with (
            mock.patch(
                "planning.views_v2.validate_scenario_configuration",
                return_value=["Provide either `max_budget` or `max_area`."],
            ) as validate_mock,
            mock.patch("planning.views_v2.trigger_scenario_run") as trigger_mock,
        ):
            response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(), {"errors": ["Provide either `max_budget` or `max_area`."]}
        )
        trigger_mock.assert_not_called()

    def test_run_unauthenticated_returns_401(self):
        response = self.client.post(self.url, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_run_forbidden_for_other_user_returns_404(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.post(self.url, format="json")
        # get_object() hides unauthorized scenarios as 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
