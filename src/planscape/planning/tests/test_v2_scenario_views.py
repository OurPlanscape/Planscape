import copy
import json
from unittest import mock

from datasets.models import DataLayerType, GeometryType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TestCase
from django.urls import reverse
from modules.base import compute_scenario_capabilities
from rest_framework import status
from rest_framework.test import APITestCase, APITransactionTestCase

from planning.models import (
    Scenario,
    ScenarioPlanningApproach,
    ScenarioCapability,
    ScenarioResult,
    ScenarioType,
    ScenarioVersion,
    TreatmentGoalGroup,
)
from planning.serializers import ListScenarioSerializer, ScenarioV2Serializer
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

    @mock.patch("planning.tasks.prepare_scenarios_for_forsys_and_run", autospec=True)
    def test_create_with_explicit_treatment_goal(self, task_mock):
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
        self.assertEqual(task_mock.delay.call_count, 1)
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
            "weights": [],
            "targets": {
                "estimated_cost": 2000,
                "max_area": 40000,
            },
            "stand_size": "LARGE",
            "excluded_areas": [],
            "stand_thresholds": [],
            "global_thresholds": [],
            "scenario_priorities": ["prio1"],
            "scenario_output_fields": ["out1"],
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
            budget_conf["targets"] = {
                "max_area": acres,
            }
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

    def test_sort_scenario_by_reverse_acres_v3(self):
        for acres in range(100, 105):
            v3_config = {
                "targets": {
                    "max_area": acres,
                    "estimated_cost": 2000,
                },
                "stand_size": "LARGE",
            }
            ScenarioFactory.create(
                planning_area=self.planning_area,
                name=f"v3_scenario_{acres}",
                configuration=v3_config,
                user=self.owner_user,
            )

        self.client.force_authenticate(self.owner_user)
        query_params = {"ordering": "-acres"}
        response = self.client.get(
            reverse("api:planning:scenarios-list"),
            query_params,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        response_data = response.json()

        budget_results = [s["max_treatment_area"] for s in response_data]
        expected_acres_order = [40000, 40000, 40000, 104, 103, 102, 101, 100]
        self.assertEqual(budget_results, expected_acres_order)

    def test_sort_scenario_by_multiple_fields(self):
        for a in range(1, 4):
            for n in ["aaaa", "bbbb", "cccc"]:
                v3_conf = copy.deepcopy(self.configuration)
                v3_conf["targets"] = {
                    "max_area": a,
                }
                ScenarioFactory.create(
                    planning_area=self.planning_area,
                    name=f"{n} scenario,a{a}",
                    configuration=v3_conf,
                    user=self.owner_user,
                )
        self.client.force_authenticate(self.owner_user)

        # sort by rev budget, then acres, then name
        query_params = {"ordering": "acres,-name"}
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
            "cccc scenario,a1",
            "bbbb scenario,a1",
            "aaaa scenario,a1",
            "cccc scenario,a2",
            "bbbb scenario,a2",
            "aaaa scenario,a2",
            "cccc scenario,a3",
            "bbbb scenario,a3",
            "aaaa scenario,a3",
            # these initial records have None for acres
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
        self.assertEqual(data.get("version"), ScenarioVersion.V3)

        configuration = self.scenario.configuration.copy()
        configuration.pop("targets")
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

        configuration["targets"] = [
            {
                "max_area": 5000.0,
                "max_project_count": 5,
                "estimated_cost": 100.0,
            }
        ]
        self.scenario.configuration = configuration
        self.scenario.save()

        response = self.client.get(
            reverse(
                "api:planning:scenarios-detail",
                kwargs={"pk": self.scenario.pk},
            ),
            content_type="application/json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("version"), ScenarioVersion.V3)


class ScenarioDetailTest(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.owner_user)
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

    def test_detail_scenario_v3_custom_usage_types(self):
        priority = DataLayerFactory(name="Priority Layer")
        cobenefit = DataLayerFactory(name="Cobenefit Layer")
        v3_config = {
            "targets": {
                "max_area": 5000.0,
                "max_project_count": 5,
                "estimated_cost": 100.0,
            },
            "priority_objectives": [priority.pk],
            "cobenefits": [cobenefit.pk],
        }
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.owner_user,
            configuration=v3_config,
            type=ScenarioType.CUSTOM,
            treatment_goal=None,
        )

        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("api:planning:scenarios-detail", args=[scenario.pk]),
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            data.get("usage_types"),
            [
                {"usage_type": "PRIORITY", "datalayer": "Priority Layer"},
                {"usage_type": "SECONDARY_METRIC", "datalayer": "Cobenefit Layer"},
            ],
        )

    def test_detail_scenario_v2_scenario_result(self):
        ScenarioResultFactory(scenario=self.scenario)
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
        self.assertNotIn(
            "text_geometry",
            data["scenario_result"]["result"]["features"][0]["properties"].keys(),
        )

    def test_retrieve_scenario_versions_v2_and_v3(self):
        self.client.force_authenticate(self.owner_user)

        v2_scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.owner_user,
            configuration={"max_budget": 5000, "stand_size": "LARGE"},
        )
        resp_v2 = self.client.get(
            reverse("api:planning:scenarios-detail", args=[v2_scenario.pk]),
            format="json",
        )
        self.assertEqual(resp_v2.status_code, 200)
        self.assertEqual(resp_v2.data.get("version"), ScenarioVersion.V2)
        config = resp_v2.data.get("configuration", {})
        self.assertIn("max_budget", config)
        self.assertNotIn("targets", config)

        v3_scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.owner_user,
            configuration={
                "targets": {
                    "max_area": 5000.0,
                    "max_project_count": 5,
                    "estimated_cost": 100.0,
                },
                "stand_size": "SMALL",
            },
        )
        resp_v3 = self.client.get(
            reverse("api:planning:scenarios-detail", args=[v3_scenario.pk]),
            format="json",
        )
        self.assertEqual(resp_v3.status_code, 200)
        self.assertEqual(resp_v3.data.get("version"), ScenarioVersion.V3)
        config = resp_v3.data.get("configuration", {})
        self.assertIn("targets", config)
        targets = config["targets"]
        self.assertEqual(targets["max_area"], 5000.0)
        self.assertEqual(targets["estimated_cost"], 100.0)


class UpdateScenarioTest(APITestCase):
    def setUp(self):
        self.creator = UserFactory()
        self.owner = UserFactory()
        self.collaborator = UserFactory()
        self.viewer = UserFactory()
        self.not_invited = UserFactory()

        self.planning_area = PlanningAreaFactory(
            user=self.creator,
            owners=[self.creator, self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )

        self.scenario = ScenarioFactory(
            user=self.creator,
            planning_area=self.planning_area,
            name="some patchable scenario",
        )

        self.url = reverse("api:planning:scenarios-detail", args=[self.scenario.pk])
        self.payload = {"name": "renamed scenario"}

    def test_creator_can_update_scenario_name(self):
        self.client.force_authenticate(self.creator)
        response = self.client.patch(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.scenario.refresh_from_db()
        body = response.json()
        self.assertEqual(body.get("name"), self.scenario.name)
        self.assertEqual(self.scenario.name, "renamed scenario")
        self.assertEqual(self.scenario.user, self.creator)

    def test_owner_can_update_scenario_name(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.scenario.refresh_from_db()
        body = response.json()
        self.assertEqual(body.get("name"), self.scenario.name)
        self.assertEqual(self.scenario.name, "renamed scenario")
        self.assertEqual(self.scenario.user, self.creator)

    def test_collaborator_cannot_update_scenario_name(self):
        self.client.force_authenticate(self.collaborator)
        response = self.client.patch(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "some patchable scenario")
        self.assertEqual(self.scenario.user, self.creator)

    def test_collaborator_can_update_its_own_scenario_name(self):
        self.client.force_authenticate(self.collaborator)
        scenario = ScenarioFactory(
            user=self.collaborator,
            planning_area=self.planning_area,
            name="collaborator's scenario",
        )
        url = reverse("api:planning:scenarios-detail", args=[scenario.pk])
        response = self.client.patch(url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scenario.refresh_from_db()
        body = response.json()
        self.assertEqual(body.get("name"), scenario.name)
        self.assertEqual(scenario.name, "renamed scenario")
        self.assertEqual(scenario.user, self.collaborator)

    def test_viewer_cannot_update_scenario_name(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.patch(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "some patchable scenario")
        self.assertEqual(self.scenario.user, self.creator)

    def test_not_invited_cannot_update_scenario_name(self):
        self.client.force_authenticate(self.not_invited)
        response = self.client.patch(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "some patchable scenario")
        self.assertEqual(self.scenario.user, self.creator)


# This should test exclusively the 'V3' configuration
class PatchScenarioConfigurationTest(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()

        self.planning_area = PlanningAreaFactory(user=self.user)
        self.treatment_goal = TreatmentGoalFactory()

        self.scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            name="some patchable scenario",
        )

        self.url = reverse(
            "api:planning:scenarios-patch-draft", args=[self.scenario.pk]
        )

    def test_patch_scenario_configuration_success(self):
        payload = {
            "configuration": {
                "targets": {
                    "estimated_cost": 12345,
                    "max_area": 11111,
                    "max_project_count": 10,
                },
                "stand_size": "SMALL",
            }
        }

        self.client.force_authenticate(self.user)
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        config = response.data.get("configuration", {})

        self.assertEqual(config.get("stand_size"), "SMALL")
        self.assertEqual(config.get("targets").get("estimated_cost"), 12345)

    # Test sequential patches, ensure we retain values as expected
    def test_patch_scenario_incremental_updates(self):
        from datasets.models import DataLayerType, GeometryType
        from datasets.tests.factories import DataLayerFactory

        from planning.tests.factories import TreatmentGoalFactory

        # create valid excluded_areas and included_areas with real PKs
        excluded_layers = DataLayerFactory.create_batch(
            3,
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POLYGON,
        )
        included_layers = DataLayerFactory.create_batch(
            2,
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POLYGON,
        )
        excluded_ids = [layer.pk for layer in excluded_layers]
        included_ids = [layer.pk for layer in included_layers]

        # initial patch - baseline configuration
        payload = {
            "min_distance_from_road": 100,
            "max_project_count": 5,
            "configuration": {
                "targets": {
                    "estimated_cost": 12345,
                    "max_area": 11111,
                    "max_project_count": 10,
                },
            },
        }
        self.client.force_authenticate(self.user)
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        config = response.data.get("configuration", {})
        targets = config.get("targets", {})
        self.assertEqual(targets.get("estimated_cost"), 12345)
        self.assertEqual(targets.get("max_area"), 11111)
        self.assertNotIn(
            "stand_size", config, "The 'stand_size' key should not have a default."
        )

        # second patch - modify stand_size + add excluded_areas
        payload2 = {
            "configuration": {
                "stand_size": "MEDIUM",
                "targets": {"estimated_cost": 22222, "max_area": 11111},
                "excluded_areas": excluded_ids,
            }
        }

        response2 = self.client.patch(self.url, payload2, format="json")
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        config2 = response2.data.get("configuration", {})
        targets2 = config2.get("targets")
        self.assertEqual(targets2.get("estimated_cost"), 22222)
        self.assertCountEqual(config2.get("excluded_areas"), excluded_ids)
        self.assertEqual(config2.get("stand_size"), "MEDIUM")

        # third patch - clear excluded_areas
        payload3 = {"configuration": {"excluded_areas": []}}
        response3 = self.client.patch(self.url, payload3, format="json")
        self.assertEqual(response3.status_code, status.HTTP_200_OK)

        config3 = response3.data.get("configuration", {})
        self.assertEqual(config3.get("excluded_areas"), [])
        self.assertEqual(config3.get("stand_size"), "MEDIUM")

        # fourth patch - invalid stand_size value
        payload4 = {"configuration": {"stand_size": "INVALID VALUE"}}
        response4 = self.client.patch(self.url, payload4, format="json")
        self.assertEqual(response4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            b'{"configuration":{"stand_size":["\\"INVALID VALUE\\" is not a valid choice."]}}',
            response4.content,
        )

        # fifth patch - add included_areas and constraints
        constraint_layer = DataLayerFactory(
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POLYGON,
        )
        constraint = {
            "datalayer": constraint_layer.pk,
            "operator": "lt",
            "value": "50",
        }
        payload5 = {
            "configuration": {
                "included_areas": included_ids,
                "constraints": [constraint],
            }
        }

        response5 = self.client.patch(self.url, payload5, format="json")
        self.assertEqual(response5.status_code, status.HTTP_200_OK)

        config5 = response5.data.get("configuration", {})
        self.assertCountEqual(config5.get("included_areas"), included_ids)
        self.assertEqual(len(config5.get("constraints", [])), 1)
        self.assertEqual(config5["constraints"][0]["operator"], "lt")

        # sixth patch - invalid constraint operator
        payload6 = {
            "configuration": {
                "constraints": [
                    {"datalayer": constraint_layer.pk, "operator": "bad", "value": "10"}
                ]
            }
        }

        response6 = self.client.patch(self.url, payload6, format="json")
        self.assertEqual(response6.status_code, status.HTTP_400_BAD_REQUEST)

        error_data = response6.json()["configuration"]["constraints"]
        self.assertIn("0", error_data)
        self.assertIn("operator", error_data["0"])
        self.assertIn("is not a valid choice", error_data["0"]["operator"][0])

        # seventh patch - update seed + nested targets override
        payload7 = {
            "configuration": {
                "seed": 999,
                "targets": {
                    "estimated_cost": 33333,
                    "max_area": 22222,
                    "max_project_count": 7,
                },
            }
        }

        response7 = self.client.patch(self.url, payload7, format="json")
        self.assertEqual(response7.status_code, status.HTTP_200_OK)

        config7 = response7.data.get("configuration", {})
        self.assertEqual(config7.get("seed"), 999)
        self.assertEqual(config7["targets"]["estimated_cost"], 33333)
        self.assertEqual(config7["targets"]["max_project_count"], 7)

        # eighth patch - change treatment_goal along with config
        new_goal = TreatmentGoalFactory()
        payload8 = {
            "treatment_goal": new_goal.pk,
            "configuration": {"stand_size": "SMALL"},
        }

        response8 = self.client.patch(self.url, payload8, format="json")
        self.assertEqual(response8.status_code, status.HTTP_200_OK)

        config8 = response8.data.get("configuration", {})
        self.assertEqual(config8.get("stand_size"), "SMALL")
        self.assertEqual(response8.data["treatment_goal"]["id"], new_goal.pk)
        self.assertEqual(response8.data["treatment_goal"]["name"], new_goal.name)

    def test_patch_scenario_configuration_unauthenticated(self):
        payload = {"max_budget": 5000}
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_scenario_configuration_forbidden_for_other_user(self):
        scenario = ScenarioFactory(user=self.other_user)
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"max_budget": 100000}

        # Authenticate as a user who does not own the scenario
        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")

        # Expect 404 since get_object() hides unauthorized scenarios
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_scenario_configuration_invalid_scenario_id(self):
        invalid_url = reverse("api:planning:scenarios-patch-draft", args=[999999])
        self.client.force_authenticate(self.user)
        payload = {"max_budget": 5000}

        response = self.client.patch(invalid_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_preset_rejects_priority_objectives_and_cobenefits(self):
        scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            type=ScenarioType.PRESET,
            treatment_goal=self.treatment_goal,
        )
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        priority = DataLayerFactory()
        cobenefit = DataLayerFactory()
        payload = {
            "configuration": {
                "priority_objectives": [priority.pk],
                "cobenefits": [cobenefit.pk],
            }
        }

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {
                "configuration": [
                    "Preset scenarios cannot set `priority_objectives` or `cobenefits`."
                ]
            },
        )

    def test_patch_custom_rejects_treatment_goal(self):
        priority = DataLayerFactory()
        scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            type=ScenarioType.CUSTOM,
            configuration={"priority_objectives": [priority.pk]},
            treatment_goal=None,
        )
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"treatment_goal": self.treatment_goal.pk}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {"treatment_goal": ["Custom scenarios cannot set a Treatment Goal."]},
        )

    def test_patch_custom_requires_priority_objectives(self):
        scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            type=ScenarioType.CUSTOM,
            configuration={},
            treatment_goal=None,
        )
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {
            "configuration": {
                "targets": {"max_area": 1000, "max_project_count": 1},
            }
        }

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {
                "configuration": {
                    "priority_objectives": (
                        "Configuration field `priority_objectives` is required."
                    )
                }
            },
        )

    def test_patch_custom_allows_stand_size_without_priority_objectives(self):
        scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            type=ScenarioType.CUSTOM,
            configuration={},
            treatment_goal=None,
        )
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"configuration": {"stand_size": "SMALL"}}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("configuration", {}).get("stand_size"), "SMALL")

    def test_patch_preset_allows_stand_size_without_treatment_goal(self):
        scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            type=ScenarioType.PRESET,
            configuration={},
            treatment_goal=None,
        )
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"configuration": {"stand_size": "SMALL"}}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("configuration", {}).get("stand_size"), "SMALL")

    def test_patch_scenario_approach(self):
        scenario = ScenarioFactory(
            user=self.user,
            planning_area=self.planning_area,
            type=ScenarioType.PRESET,
            configuration={},
            treatment_goal=None,
        )
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"configuration": {"stand_size": "SMALL"}, "planning_approach": ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS.value}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("planning_approach"), ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS.value)

    def test_patch_sub_units(self):
        scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
            configuration={},
            treatment_goal=None,
            planning_approach=ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS,
        )
        sub_units_layer = DataLayerFactory.create(type=DataLayerType.VECTOR)
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"configuration": {"sub_units_layer": sub_units_layer.pk}}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("configuration", {}).get("sub_units_layer"), sub_units_layer.pk)

    def test_patch_sub_units_with_optimize_project_areas_approach(self):
        scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
            configuration={},
            treatment_goal=None,
        )
        sub_units_layer = DataLayerFactory.create(type=DataLayerType.VECTOR)
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"configuration": {"sub_units_layer": sub_units_layer.pk}}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'planning_approach': {'configuration': 'Scenarios with `Optimize Project Areas` Planning Approach cannot have Sub Units Layer set.'}})

    def test_patch_sub_units_with_raster_datalayer(self):
        scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
            configuration={},
            treatment_goal=None,
            planning_approach=ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS,
        )
        raster_layer = DataLayerFactory.create(type=DataLayerType.RASTER)
        url = reverse("api:planning:scenarios-patch-draft", args=[scenario.pk])
        payload = {"configuration": {"sub_units_layer": raster_layer.pk}}

        self.client.force_authenticate(self.user)
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ScenarioCapabilitiesViewTest(APITestCase):
    def setUp(self):
        westwide_geom = MultiPolygon(
            GEOSGeometry(
                json.dumps(
                    {
                        "coordinates": [
                            [
                                [-123.0, 44.0],
                                [-123.0, 44.5],
                                [-122.5, 44.5],
                                [-122.5, 44.0],
                                [-123.0, 44.0],
                            ]
                        ],
                        "type": "Polygon",
                    }
                )
            )
        )
        eastwide_geom = MultiPolygon(
            GEOSGeometry(
                json.dumps(
                    {
                        "coordinates": [
                            [
                                [-80.0, 40.0],
                                [-80.0, 40.5],
                                [-79.5, 40.5],
                                [-79.5, 40.0],
                                [-80.0, 40.0],
                            ]
                        ],
                        "type": "Polygon",
                    }
                )
            )
        )
        california_pa_geom = MultiPolygon(
            GEOSGeometry(
                json.dumps(
                    {
                        "coordinates": [
                            [
                                [-119.27995274110515, 36.36478317620936],
                                [-119.27995274110515, 36.0314305736712],
                                [-118.8507705399656, 36.0314305736712],
                                [-118.8507705399656, 36.36478317620936],
                                [-119.27995274110515, 36.36478317620936],
                            ]
                        ],
                        "type": "Polygon",
                    }
                )
            )
        )
        self.user = UserFactory.create()
        # Planning area in western US but outside California
        self.planning_area1 = PlanningAreaFactory.create(
            user=self.user, geometry=westwide_geom
        )
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.user, geometry=california_pa_geom
        )
        self.planning_area3 = PlanningAreaFactory.create(
            user=self.user, geometry=eastwide_geom
        )
        self.tg_conus = TreatmentGoalFactory.create(
            group=TreatmentGoalGroup.WILDFIRE_RISK_TO_COMMUTIES
        )
        self.treatment_goal = TreatmentGoalFactory.create(
            group=TreatmentGoalGroup.CALIFORNIA_PLANNING_METRICS
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area1,
            user=self.user,
            treatment_goal=self.tg_conus,
            configuration={"stand_size": "LARGE"},
            name="caps-view1",
        )
        self.scenario2 = ScenarioFactory.create(
            planning_area=self.planning_area2,
            user=self.user,
            treatment_goal=self.treatment_goal,
            configuration={"stand_size": "LARGE"},
            name="caps-view2",
        )
        self.scenario3 = ScenarioFactory.create(
            planning_area=self.planning_area3,
            user=self.user,
            treatment_goal=self.tg_conus,
            configuration={"stand_size": "LARGE"},
            name="caps-view3",
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
        self.assertSetEqual(set(caps), {"MAP", "FORSYS", "CLIMATE_FORESIGHT"})

    def test_capabilities_present_in_detail_inside_california(self):
        self.scenario2.capabilities = compute_scenario_capabilities(self.scenario2)
        self.scenario2.save(update_fields=["capabilities"])

        self.client.force_authenticate(self.user)
        url = reverse("api:planning:scenarios-detail", args=[self.scenario2.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        caps = resp.data.get("capabilities")
        self.assertIsInstance(caps, list)
        self.assertSetEqual(
            set(caps), {"MAP", "FORSYS", "IMPACTS", "CLIMATE_FORESIGHT"}
        )

    def test_capabilities_present_in_detail_outside_future_climate(self):
        self.scenario3.capabilities = compute_scenario_capabilities(self.scenario3)
        self.scenario3.save(update_fields=["capabilities"])

        self.client.force_authenticate(self.user)
        url = reverse("api:planning:scenarios-detail", args=[self.scenario3.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        caps = resp.data.get("capabilities")
        self.assertIsInstance(caps, list)
        self.assertSetEqual(set(caps), {"MAP", "FORSYS"})


class CreateScenarioForDraftsTest(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.user2 = UserFactory()
        self.other_user = UserFactory()

        self.planning_area = PlanningAreaFactory(user=self.user)
        self.planning_area2 = PlanningAreaFactory(user=self.user2)
        self.treatment_goal = TreatmentGoalFactory()

    def test_create_with_name_and_planning_area(self):
        payload = {
            "name": "my dear scenario",
            "planning_area": self.planning_area.pk,
            "type": "PRESET",
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-create-draft"),
            payload,
            format="json",
        )
        scenario = response.json()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(scenario.get("id"))
        self.assertEqual(scenario.get("scenario_result").get("status"), "DRAFT")
        self.assertEqual(scenario.get("version"), "V3")
        self.assertEqual(scenario.get("type"), "PRESET")

    def test_create_with_custom_type(self):
        payload = {
            "name": "custom scenario",
            "planning_area": self.planning_area.pk,
            "type": "CUSTOM",
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-create-draft"),
            payload,
            format="json",
        )
        scenario = response.json()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(scenario.get("type"), "CUSTOM")

    def test_create_without_name(self):
        payload = {
            "planning_area": self.planning_area.pk,
            "type": "PRESET",
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-create-draft"),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            b'{"name":["This field is required."]}',
            response.content,
        )

    def test_create_without_type(self):
        payload = {
            "name": "missing type",
            "planning_area": self.planning_area.pk,
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-create-draft"),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            b'{"type":["This field is required."]}',
            response.content,
        )

    def test_create_for_planning_area_without_permission(self):
        payload = {
            "planning_area": self.planning_area2.pk,
            "name": "scenario in some other users area",
        }
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:scenarios-create-draft"),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


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
            configuration={"stand_size": "LARGE", "max_budget": 1000},
        )
        self.url = reverse("api:planning:scenarios-run", args=[self.scenario.pk])

    def test_run_success_returns_202_and_triggers_run(self):
        self.client.force_authenticate(self.user)
        with (
            mock.patch(
                "planning.views_v2.validate_scenario_configuration", return_value=[]
            ) as validate_mock,  # noqa: F841
            mock.patch(
                "planning.views_v2.trigger_scenario_run"
            ) as trigger_mock,  # noqa
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
            ) as validate_mock,  # noqa: F841
            mock.patch(
                "planning.views_v2.trigger_scenario_run"
            ) as trigger_mock,  # noqa
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


class DeleteScenarioTest(APITestCase):
    def setUp(self):
        self.creator = UserFactory.create()
        self.owner = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.viewer = UserFactory.create()

        self.planning_area = PlanningAreaFactory.create(
            user=self.creator,
            owners=[self.creator, self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )

        self.creators_scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.creator
        )
        self.owners_scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.owner
        )
        self.collab_scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.collaborator
        )

    def test_delete_creators_scenario_as_creator(self):
        url = reverse("api:planning:scenarios-detail", args=[self.creators_scenario.pk])
        self.client.force_authenticate(self.creator)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_creators_scenario_as_owner(self):
        url = reverse("api:planning:scenarios-detail", args=[self.creators_scenario.pk])
        self.client.force_authenticate(self.owner)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_creators_scenario_as_collaborator(self):
        url = reverse("api:planning:scenarios-detail", args=[self.creators_scenario.pk])
        self.client.force_authenticate(self.collaborator)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 403)

    def test_delete_creators_scenario_as_viewer(self):
        url = reverse("api:planning:scenarios-detail", args=[self.creators_scenario.pk])
        self.client.force_authenticate(self.viewer)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 403)

    def test_delete_owners_scenario_as_creator(self):
        url = reverse("api:planning:scenarios-detail", args=[self.owners_scenario.pk])
        self.client.force_authenticate(self.creator)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_owners_scenario_as_owner(self):
        url = reverse("api:planning:scenarios-detail", args=[self.owners_scenario.pk])
        self.client.force_authenticate(self.owner)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_owners_scenario_as_collaborator(self):
        url = reverse("api:planning:scenarios-detail", args=[self.owners_scenario.pk])
        self.client.force_authenticate(self.collaborator)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 403)

    def test_delete_owners_scenario_as_viewer(self):
        url = reverse("api:planning:scenarios-detail", args=[self.owners_scenario.pk])
        self.client.force_authenticate(self.viewer)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 403)

    def test_delete_collab_scenario_as_creator(self):
        url = reverse("api:planning:scenarios-detail", args=[self.collab_scenario.pk])
        self.client.force_authenticate(self.creator)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_collab_scenario_as_owner(self):
        url = reverse("api:planning:scenarios-detail", args=[self.collab_scenario.pk])
        self.client.force_authenticate(self.owner)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_collab_scenario_as_collaborator(self):
        url = reverse("api:planning:scenarios-detail", args=[self.collab_scenario.pk])
        self.client.force_authenticate(self.collaborator)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)

    def test_delete_collab_scenario_as_viewer(self):
        url = reverse("api:planning:scenarios-detail", args=[self.collab_scenario.pk])
        self.client.force_authenticate(self.viewer)

        response = self.client.delete(url)

        self.assertEqual(response.status_code, 403)
