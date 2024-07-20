import json
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from collaboration.tests.helpers import create_collaborator_record
from collaboration.models import Permissions, Role
from planning.geometry import coerce_geometry
from planning.models import (
    Scenario,
    ScenarioResult,
)
from planning.tests.helpers import (
    _create_planning_area,
    _create_scenario,
    _create_test_user_set,
    reset_permissions,
    _load_geojson_fixture,
)
from planning.tests.factories import PlanningAreaFactory


class ListScenariosForPlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()

        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]
        self.owner_user2 = self.test_users["owner2"]
        self.collab_user = self.test_users["collaborator"]
        self.viewer_user = self.test_users["viewer"]
        self.unprivileged_user = self.test_users["unprivileged"]

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.storable_geometry
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
        self.scenario = _create_scenario(
            self.planning_area,
            "test scenario",
            self.configuration,
            user=self.owner_user,
        )
        self.scenario2 = _create_scenario(
            self.planning_area,
            "test scenario2",
            self.configuration,
            user=self.owner_user,
        )
        self.scenario3 = _create_scenario(
            self.planning_area,
            "test scenario3",
            self.configuration,
            user=self.owner_user,
        )
        self.empty_planning_area = _create_planning_area(
            self.owner_user, "empty test plan", self.storable_geometry
        )

        self.owner_user2 = User.objects.create(username="testuser2")
        self.owner_user2.set_password("12345")
        self.owner_user2.save()
        self.planning_area2 = _create_planning_area(
            self.owner_user2, "test plan2", self.storable_geometry
        )
        self.owner_user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}", user=self.owner_user2
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
        )

        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
        )
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_list_scenario(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(scenarios["count"], 3)
        self.assertEqual(len(scenarios["results"]), 3)
        self.assertIsNotNone(scenarios["results"][0]["created_at"])
        self.assertIsNotNone(scenarios["results"][0]["updated_at"])

    def test_toggle_scenario_status(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.post(
            reverse(
                "planning:scenarios-toggle-status",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        scenario = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(scenario.get("status"), "ARCHIVED")

        # toogle back!
        response = self.client.post(
            reverse(
                "planning:scenarios-toggle-status",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
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
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
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
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area2.pk},
            ),
            content_type="application/json",
        )
        # self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )

    def test_list_scenario_collab_user(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(scenarios["count"], 3)
        self.assertEqual(len(scenarios["results"]), 3)
        self.assertIsNotNone(scenarios["results"][0]["created_at"])
        self.assertIsNotNone(scenarios["results"][0]["updated_at"])

    def test_list_scenario_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(scenarios["count"], 3)
        self.assertEqual(len(scenarios["results"]), 3)
        self.assertIsNotNone(scenarios["results"][0]["created_at"])
        self.assertIsNotNone(scenarios["results"][0]["updated_at"])

    def test_list_scenario_unprivileged_user(self):
        self.client.force_authenticate(self.unprivileged_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )

    def test_list_scenario_empty_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.empty_planning_area.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios["results"]), 0)

    def test_list_scenario_nonexistent_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": 99999},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertJSONEqual(
            response.content, {"detail": "No PlanningArea matches the given query."}
        )


class CreateScenarios(APITransactionTestCase):
    def setUp(self):
        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]

        self.la_county_geo = _load_geojson_fixture("la_county.geojson")
        self.la_features = _load_geojson_fixture("la_features.geojson")
        self.bayarea_geo = _load_geojson_fixture("bayarea.geojson")

        self.burbank_shpjs = {
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-118.30225, 34.196327],
                        [-118.334029, 34.194174],
                        [-118.365419, 34.174367],
                        [-118.3022, 34.159177],
                        [-118.258063, 34.166767],
                        [-118.249365, 34.182766],
                        [-118.30225, 34.196327],
                    ]
                ],
            }
        }
        self.la_multi_shpjs = {
            "geometry": {
                "coordinates": [
                    [
                        [-118.30225, 34.196327],
                        [-118.334029, 34.194174],
                        [-118.365419, 34.174367],
                        [-118.3022, 34.159177],
                        [-118.258063, 34.166767],
                        [-118.249365, 34.182766],
                        [-118.30225, 34.196327],
                    ],
                    [
                        [-118.377882, 34.11097],
                        [-118.447442, 34.113653],
                        [-118.453988, 34.075555],
                        [-118.436742, 34.045408],
                        [-118.336649, 34.044481],
                        [-118.288021, 34.073666],
                        [-118.294062, 34.10461],
                        [-118.377882, 34.11097],
                    ],
                    [
                        [-118.20343, 34.126106],
                        [-118.248104, 34.11713],
                        [-118.272937, 34.078179],
                        [-118.316097, 34.037767],
                        [-118.259814, 33.986624],
                        [-118.157527, 33.996031],
                        [-118.137324, 34.045068],
                        [-118.143416, 34.106869],
                        [-118.20343, 34.126106],
                    ],
                    [
                        [-118.074253, 34.073687],
                        [-118.119187, 34.053145],
                        [-118.145405, 34.008519],
                        [-118.106502, 34.005393],
                        [-118.092114, 34.042635],
                        [-118.074253, 34.073687],
                    ],
                ],
                "type": "Polygon",
            }
        }

        self.planning_area = PlanningAreaFactory(
            user=self.owner_user,
            geometry=coerce_geometry(self.la_county_geo["geometry"]),
        )

    def test_confirm_permissions_required(self):
        payload = {
            "geometry": self.burbank_shpjs,
            "name": "new scenario",
            "stand_size": "SMALL",
        }
        response = self.client.post(
            reverse(
                "planning:scenarios-upload-shapefile",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_create_from_single_feature_shpjs(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": self.burbank_shpjs,
            "name": "new scenario",
            "stand_size": "SMALL",
        }
        response = self.client.post(
            reverse(
                "planning:scenarios-upload-shapefile",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response_data["project_areas"]), 1)

    def test_create_from_multifeature_shpjs(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": self.la_multi_shpjs,
            "name": "new scenario",
            "stand_size": "SMALL",
        }
        response = self.client.post(
            reverse(
                "planning:scenarios-upload-shapefile",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response_data["project_areas"]), 4)

    def test_create_from_geojson(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": self.la_features,
            "name": "new scenario",
            "stand_size": "SMALL",
        }
        response = self.client.post(
            reverse(
                "planning:scenarios-upload-shapefile",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response_data["project_areas"]), 4)

    def test_create_uncontained_geometry(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": self.bayarea_geo,
            "name": "new scenario",
            "stand_size": "SMALL",
        }
        response = self.client.post(
            reverse(
                "planning:scenarios-upload-shapefile",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEquals(
            b'{"error":"Uploaded geometry is not contained by planning area"}',
            response.content,
        )
