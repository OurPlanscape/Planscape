import json

from collaboration.models import Role
from collaboration.tests.factories import UserObjectRoleFactory
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.urls import reverse
from impacts.permissions import (
    COLLABORATOR_PERMISSIONS,
    OWNER_PERMISSIONS,
    VIEWER_PERMISSIONS,
)
from rest_framework import status
from rest_framework.test import APITestCase, APITransactionTestCase

from planning.models import (
    PlanningArea,
    RegionChoices,
    ScenarioResult,
    TreatmentGoal,
    TreatmentGoalCategory,
    TreatmentGoalGroup,
    TreatmentGoalUsesDataLayer,
)
from planning.tests.factories import (
    PlanningAreaFactory,
    ScenarioFactory,
    TreatmentGoalFactory,
    UserFactory,
)
from planning.tests.helpers import _load_geojson_fixture


class CreatorsTest(APITestCase):
    def setUp(self):
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.user_a = UserFactory.create(
            username="user a", first_name="user", last_name="a"
        )
        self.user_b = UserFactory.create(
            username="user b", first_name="user", last_name="b"
        )
        self.user_c = UserFactory.create(
            username="user c", first_name="user", last_name="c"
        )
        self.user_d = UserFactory.create(
            username="user d", first_name="user", last_name="d"
        )
        self.user_e = UserFactory.create(
            username="user e", first_name="user", last_name="e"
        )
        self.test_pa_user_a = PlanningAreaFactory.create_batch(
            size=11,
            user=self.user_a,
            geometry=stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.test_pa_user_b = PlanningAreaFactory.create_batch(
            size=11,
            user=self.user_b,
            geometry=stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )

        # Note: No areas for user_c

        self.test_pa_user_d = PlanningAreaFactory.create_batch(
            size=11,
            user=self.user_d,
            geometry=stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.test_pa_user_e = PlanningAreaFactory.create_batch(
            size=11,
            user=self.user_e,
            geometry=stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )

    # Test - if no planning areas are shared w/ logged in user, then we only see
    # the creators list for the logged in user
    def test_list_creators_no_sharing(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.get(
            reverse("api:planning:creators-list"), {}, content_type="application/json"
        )
        creator_results = json.loads(response.content)

        ids = []
        creator_names = []
        for c in creator_results:
            ids.append(c["id"])
            creator_names.append(f"{c['full_name']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(ids), {self.user_a.pk})
        self.assertEqual(set(creator_names), {"user a"})

    # Test - if planning areas are shared w/ logged in user,
    # then any creator in that list will appear
    def test_list_creators_shared(self):
        UserObjectRoleFactory(
            inviter=self.user_b,
            collaborator=self.user_a,
            email=self.user_a.email,
            role=Role.COLLABORATOR,
            associated_model=self.test_pa_user_b[0],
        )

        UserObjectRoleFactory(
            inviter=self.user_e,
            collaborator=self.user_a,
            email=self.user_a.email,
            role=Role.COLLABORATOR,
            associated_model=self.test_pa_user_e[0],
        )
        self.client.force_authenticate(self.user_a)
        response = self.client.get(
            reverse("api:planning:creators-list"), {}, content_type="application/json"
        )
        creator_results = json.loads(response.content)
        ids = []
        creator_names = []
        for c in creator_results:
            ids.append(c["id"])
            creator_names.append(f"{c['full_name']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(ids), {self.user_a.pk, self.user_b.pk, self.user_e.pk})
        self.assertEqual(set(creator_names), {"user a", "user b", "user e"})


class GetPlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory.create(username="testuser")

        self.user2 = UserFactory.create(username="otherowner")

        self.emptyuser = UserFactory.create(username="emptyuser")

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        # name_fn = lambda x: f"test plan {x}".format(x)
        self.test_pa_sn = PlanningAreaFactory.create_batch(
            size=10,
            user=self.user,
            geometry=stored_geometry,
            region_name=RegionChoices.SIERRA_NEVADA,
        )
        self.test_pa_cc = PlanningAreaFactory.create_batch(
            size=11,
            user=self.user,
            geometry=stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.test_pa_sc = PlanningAreaFactory.create_batch(
            size=12,
            user=self.user,
            geometry=stored_geometry,
            region_name=RegionChoices.SOUTHERN_CALIFORNIA,
        )
        self.test_pa_nc = PlanningAreaFactory.create_batch(
            size=13,
            user=self.user,
            geometry=stored_geometry,
            region_name=RegionChoices.NORTHERN_CALIFORNIA,
        )
        self.test_pa_user2_nc = PlanningAreaFactory.create_batch(
            size=13,
            user=self.user2,
            geometry=stored_geometry,
            region_name=RegionChoices.NORTHERN_CALIFORNIA,
        )
        # of the created areas,
        self.planning_area1 = self.test_pa_sn[0]
        self.planning_area2 = self.test_pa_sn[1]
        self.planning_area3 = self.test_pa_sn[2]
        self.planning_area4 = self.test_pa_sn[3]
        self.planning_area5 = self.test_pa_sn[4]
        self.planning_area6 = self.test_pa_sn[4]
        self.planning_area7 = self.test_pa_sn[4]

        self.scenario1_1 = ScenarioFactory(
            planning_area=self.planning_area1,
            name="test pa1 scenario1",
            user=self.user,
        )
        self.scenario1_2 = ScenarioFactory(
            planning_area=self.planning_area1,
            name="test pa1 scenario2",
            user=self.user,
        )
        self.scenario1_3 = ScenarioFactory(
            planning_area=self.planning_area1,
            name="test pa1 scenario3",
            user=self.user,
        )
        self.planning_area1.scenario_count = 3
        self.planning_area1.save(update_fields=["updated_at", "scenario_count"])
        self.scenario3_1 = ScenarioFactory(
            planning_area=self.planning_area3,
            name="test pa3 scenario1",
            user=self.user,
        )
        self.planning_area3.scenario_count = 1
        self.planning_area3.save(update_fields=["updated_at", "scenario_count"])
        self.scenario4_1 = ScenarioFactory(
            planning_area=self.planning_area4,
            name="test pa4 scenario1",
            user=self.user,
        )
        self.scenario4_2 = ScenarioFactory(
            planning_area=self.planning_area4,
            name="test pa4 scenario2",
            user=self.user,
        )
        self.scenario4_3 = ScenarioFactory(
            planning_area=self.planning_area4,
            name="test pa4 scenario3",
            user=self.user,
        )
        self.planning_area4.scenario_count = 3
        self.planning_area4.save(update_fields=["updated_at", "scenario_count"])

    def test_list_planning_areas(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )
        self.assertEqual(planning_areas["count"], 46)
        self.assertEqual(len(planning_areas["results"]), 46)

    def test_list_planning_areas_offset(self):
        self.client.force_authenticate(self.user)
        query_params = {"offset": "20"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )
        self.assertEqual(planning_areas["count"], 46)
        self.assertEqual(len(planning_areas["results"]), 26)

    def test_filter_planning_areas_by_partial_name(self):
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        for i in range(0, 10):
            PlanningAreaFactory.create(
                user=self.user,
                name=f"created name {i}",
                geometry=stored_geometry,
            )
        for i in range(0, 10):
            PlanningAreaFactory.create(
                user=self.user,
                name=f"invented name {i}",
                geometry=stored_geometry,
            )

        self.client.force_authenticate(self.user)
        query_params = {"name": "ted"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 20)  # total results
        self.assertEqual(len(planning_areas["results"]), 20)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_region1(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "sierra-nevada"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 10)  # total results
        self.assertEqual(len(planning_areas["results"]), 10)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_region2(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "central-coast"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 11)  # total results
        self.assertEqual(len(planning_areas["results"]), 11)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_multiple_regions(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": ["central-coast", "sierra-nevada"]}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 21)  # total results
        self.assertEqual(len(planning_areas["results"]), 21)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_own_user_ids(self):
        self.client.force_authenticate(self.user)
        query_params = [("creator", str(self.user.id)), ("creator", str(self.user2.id))]
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 46)  # total results

    def test_filter_planning_areas_multiple_users_unshared(self):
        # This should only return the planning areas visible to logged in user
        self.client.force_authenticate(self.user2)
        query_params = [("creator", str(self.user.id)), ("creator", str(self.user2.id))]
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 13)

    def test_filter_planning_areas_multiple_users_some_shared(self):
        # This allows user2 to see all 13 of their own areas, plus 10 from self.user
        for pa in self.test_pa_sn:
            UserObjectRoleFactory(
                inviter=self.user,
                collaborator=self.user2,
                email=self.user2.email,
                role=Role.COLLABORATOR,
                associated_model=pa,
            )

        self.client.force_authenticate(self.user2)
        query_params = [("creator", str(self.user.id)), ("creator", str(self.user2.id))]
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 23)

    def test_filter_planning_areas_by_multiple_user_ids(self):
        # share user2's planning area with user
        UserObjectRoleFactory(
            inviter=self.user2,
            collaborator=self.user,
            email=self.user.email,
            role=Role.COLLABORATOR,
            associated_model=self.test_pa_user2_nc[0],
        )
        # auth as user1
        self.client.force_authenticate(self.user)
        query_params = [("creator", str(self.user.id)), ("creator", str(self.user2.id))]
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        user_ids_found = []
        for item in planning_areas["results"]:
            user_ids_found.append(item["user"])
        self.assertEqual({self.user.pk, self.user2.pk}, set(user_ids_found))
        self.assertEqual(planning_areas["count"], 47)  # total results

    def test_list_planning_areas_not_logged_in(self):
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    def test_list_planning_areas_empty_user(self):
        self.client.force_authenticate(self.emptyuser)
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 0)

    def test_list_planning_areas_scenario_count(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("api:planning:planningareas-list") + "?ordering=-scenario_count",
            {},
            content_type="application/json",
        )
        content = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        results = content.get("results")
        first_planning_area = results[0]
        self.assertEqual(first_planning_area.get("scenario_count"), 3)


class ListPlanningAreaSortingTest(APITestCase):
    def setUp(self):
        self.user1 = UserFactory.create(username="testuser")

        self.user2 = UserFactory.create(username="otherowner")

        self.emptyuser = UserFactory.create(username="emptyuser")

        self.geometry1 = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.geometry2 = {
            "type": "MultiPolygon",
            "coordinates": [[[[0, 20], [2, 3], [3, 4], [0, 20]]]],
        }
        self.geometry3 = {
            "type": "MultiPolygon",
            "coordinates": [[[[10, 20], [2, 30], [30, 4], [10, 20]]]],
        }
        self.geometry4 = {
            "type": "MultiPolygon",
            "coordinates": [[[[0, 20], [2, 30], [30, 4], [0, 20]]]],
        }
        geo1 = GEOSGeometry(json.dumps(self.geometry1))
        geo2 = GEOSGeometry(json.dumps(self.geometry2))
        geo3 = GEOSGeometry(json.dumps(self.geometry3))
        geo4 = GEOSGeometry(json.dumps(self.geometry4))

        self.pa1 = PlanningAreaFactory.create(
            user=self.user1,
            name="Area D",
            geometry=geo1,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.pa2 = PlanningAreaFactory.create(
            user=self.user1,
            name="Area E",
            geometry=geo3,
            region_name=RegionChoices.SIERRA_NEVADA,
        )
        self.pa3 = PlanningAreaFactory.create(
            user=self.user1,
            name="Area C",
            geometry=geo4,
            region_name=RegionChoices.SOUTHERN_CALIFORNIA,
        )
        self.pa4 = PlanningAreaFactory.create(
            user=self.user1,
            name="Area F",
            geometry=geo2,
            region_name=RegionChoices.NORTHERN_CALIFORNIA,
        )
        self.pa5 = PlanningAreaFactory.create(
            user=self.user1,
            name="Area B",
            geometry=geo3,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.pa6 = PlanningAreaFactory.create(
            user=self.user1,
            name="Area A",
            geometry=geo3,
            region_name=RegionChoices.SIERRA_NEVADA,
        )

        self.pa7 = PlanningAreaFactory.create(
            user=self.user2,
            name="Area G",
            geometry=geo1,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.pa8 = PlanningAreaFactory.create(
            user=self.user2,
            name="Area H",
            geometry=geo2,
            region_name=RegionChoices.NORTHERN_CALIFORNIA,
        )
        self.pa9 = PlanningAreaFactory.create(
            user=self.user2,
            name="Area I",
            geometry=geo3,
            region_name=RegionChoices.SIERRA_NEVADA,
        )
        self.pa10 = PlanningAreaFactory.create(
            user=self.user2,
            name="Area J",
            geometry=geo4,
            region_name=RegionChoices.CENTRAL_COAST,
        )

        self.scenario1_1 = ScenarioFactory(
            planning_area=self.pa1,
            name="test pa1 scenario1",
            user=self.user1,
        )
        self.scenario1_2 = ScenarioFactory(
            planning_area=self.pa1,
            name="test pa1 scenario2",
            user=self.user1,
        )
        self.scenario1_3 = ScenarioFactory(
            planning_area=self.pa1,
            name="test pa1 scenario3",
            user=self.user1,
        )
        self.pa1.scenario_count = 3
        self.pa1.save(update_fields=["updated_at", "scenario_count"])
        self.scenario3_1 = ScenarioFactory(
            planning_area=self.pa3,
            name="test pa3 scenario1",
            user=self.user1,
        )
        self.pa3.scenario_count = 1
        self.pa3.save(update_fields=["updated_at", "scenario_count"])
        self.scenario4_1 = ScenarioFactory(
            planning_area=self.pa4,
            name="test pa4 scenario1",
            user=self.user1,
        )
        self.scenario4_2 = ScenarioFactory(
            planning_area=self.pa4,
            name="test pa4 scenario2",
            user=self.user1,
        )
        self.scenario4_3 = ScenarioFactory(
            planning_area=self.pa4,
            name="test pa4 scenario3",
            user=self.user1,
        )
        self.pa4.scenario_count = 3
        self.pa4.save(update_fields=["updated_at", "scenario_count"])

        # user1 can see all of user2 PA records as a collaborator
        UserObjectRoleFactory(
            inviter=self.user2,
            collaborator=self.user1,
            email=self.user1.email,
            role=Role.COLLABORATOR,
            associated_model=self.pa7,
        )
        UserObjectRoleFactory(
            inviter=self.user2,
            collaborator=self.user1,
            email=self.user1.email,
            role=Role.COLLABORATOR,
            associated_model=self.pa8,
        )
        UserObjectRoleFactory(
            inviter=self.user2,
            collaborator=self.user1,
            email=self.user1.email,
            role=Role.COLLABORATOR,
            associated_model=self.pa9,
        )
        UserObjectRoleFactory(
            inviter=self.user2,
            collaborator=self.user1,
            email=self.user1.email,
            role=Role.COLLABORATOR,
            associated_model=self.pa10,
        )

    def test_list_planning_areas_sort_by_name(self):
        self.client.force_authenticate(self.user1)
        query_params = {"ordering": "name", "limit": 6}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        area_names = []
        for item in planning_areas["results"]:
            area_names.append(item["name"])
        expected_names = ["Area A", "Area B", "Area C", "Area D", "Area E", "Area F"]
        self.assertListEqual(area_names, expected_names)

    def test_list_planning_areas_sort_by_scenario_count(self):
        self.client.force_authenticate(self.user1)
        query_params = {"ordering": "scenario_count"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        scenario_counts = []
        for item in planning_areas["results"]:
            scenario_counts.append(item["scenario_count"])
        expected_scenario_counts = [0, 0, 0, 0, 0, 0, 0, 1, 3, 3]
        self.assertListEqual(scenario_counts, expected_scenario_counts)

    def test_list_planning_areas_sort_by_area_acres(self):
        self.client.force_authenticate(self.user1)
        query_params = {"ordering": "area_acres"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        acres = []
        for item in planning_areas["results"]:
            acres.append(item["area_acres"])
        self.assertListEqual(acres, sorted(acres))


class CreatePlanningAreaTest(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.valid_data = {
            "region_name": "sierra-nevada",
            "name": "my dear planning area",
            "geometry": {
                "coordinates": [
                    [
                        [-120.27761490835294, 39.15564209283124],
                        [-120.27761490835294, 39.038416306024885],
                        [-120.16134706569323, 39.038416306024885],
                        [-120.16134706569323, 39.15564209283124],
                        [-120.27761490835294, 39.15564209283124],
                    ]
                ],
                "type": "Polygon",
            },
        }

    def test_create_returns_200(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api:planning:planningareas-list"),
            self.valid_data,
            format="json",
        )
        self.assertEqual(201, response.status_code)
        self.assertEqual(1, PlanningArea.objects.count())
        data = response.json()
        self.assertIsNotNone(data.get("id"))


class CreatePlanningAreaNoRegionV2Test(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.geometry = {
            "features": [
                {
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
                    }
                }
            ]
        }

    def test_create_without_region(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            reverse("api:planning:planningareas-list"),
            {
                "name": "V2 No-Region Plan",
                "geometry": self.geometry,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data["region_name"])
        pa = PlanningArea.objects.get()
        self.assertIsNone(pa.region_name)


class ListPlanningAreasWithPermissionsTest(APITestCase):
    def setUp(self):
        self.creator_user = UserFactory.create(
            username="makerofthings",
            email="creator@test.test",
            first_name="Creaty",
            last_name="Creatington",
        )

        self.collab_user = UserFactory.create(
            username="collaboratorofthings",
            email="collab@test.test",
            first_name="Collaby",
            last_name="Collabington",
        )

        self.viewer_user = UserFactory.create(
            username="viewerofthings",
            email="viewer@test.test",
            first_name="Viewy",
            last_name="Viewington",
        )

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.planning_area_w_collab = PlanningAreaFactory.create(
            user=self.creator_user,
            name="Shared with Collaborator",
            geometry=stored_geometry,
        )
        self.planning_area_w_viewer = PlanningAreaFactory.create(
            user=self.creator_user,
            name="Area Shared with Viewer",
            geometry=stored_geometry,
        )
        self.planning_area_notshared = PlanningAreaFactory.create(
            user=self.creator_user,
            name="Not Shared Area",
            geometry=stored_geometry,
        )
        UserObjectRoleFactory(
            inviter=self.creator_user,
            collaborator=self.collab_user,
            email=self.collab_user.email,
            role=Role.COLLABORATOR,
            associated_model=self.planning_area_w_collab,
        )
        UserObjectRoleFactory(
            inviter=self.creator_user,
            collaborator=self.viewer_user,
            email=self.viewer_user.email,
            role=Role.VIEWER,
            associated_model=self.planning_area_w_viewer,
        )

    def test_planningareas_list_for_creator(self):
        self.client.force_authenticate(self.creator_user)
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        expected_perms = OWNER_PERMISSIONS

        self.assertEqual(planning_areas["count"], 3)
        self.assertEqual(planning_areas["results"][0]["role"], "Creator")
        self.assertEqual(planning_areas["results"][1]["role"], "Creator")
        self.assertEqual(planning_areas["results"][2]["role"], "Creator")
        self.assertCountEqual(
            planning_areas["results"][0]["permissions"], expected_perms
        )
        self.assertCountEqual(
            planning_areas["results"][1]["permissions"], expected_perms
        )
        self.assertCountEqual(
            planning_areas["results"][2]["permissions"], expected_perms
        )

    def test_planningareas_list_for_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(planning_areas["count"], 1)
        the_area = planning_areas["results"][0]
        self.assertEqual(the_area["role"], "Collaborator")
        self.assertCountEqual(
            the_area["permissions"],
            COLLABORATOR_PERMISSIONS,
        )

    def test_planningareas_list_for_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(planning_areas["count"], 1)
        the_area = planning_areas["results"][0]
        self.assertEqual(the_area["role"], "Viewer")
        self.assertCountEqual(the_area["permissions"], VIEWER_PERMISSIONS)


class UpdatePlanningAreaTest(APITestCase):
    def setUp(self):
        self.creator = UserFactory.create()
        self.owner = UserFactory()
        self.collaborator = UserFactory()
        self.viewer = UserFactory()
        self.planning_area = PlanningAreaFactory.create(
            user=self.creator,
            name="Editable Area",
            owners=[self.creator, self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )
        self.url = reverse(
            "api:planning:planningareas-detail",
            kwargs={"pk": self.planning_area.pk},
        )
        self.payload = {"name": "Renamed Area"}

    def test_creator_can_rename_planning_area(self):
        self.client.force_authenticate(self.creator)
        response = self.client.patch(
            self.url,
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Renamed Area")

    def test_owner_can_rename_planning_area(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            self.url,
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Renamed Area")

    def test_collaborator_cannot_rename_planning_area(self):
        self.client.force_authenticate(self.collaborator)
        response = self.client.patch(
            self.url,
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Editable Area")

    def test_viewer_cannot_rename_planning_area(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.patch(
            self.url,
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Editable Area")

    def test_rename_to_taken_name_fails(self):
        PlanningAreaFactory.create(
            user=self.creator,
            name="Another Area",
        )
        payload = {"name": "Another Area"}
        self.client.force_authenticate(self.creator)
        response = self.client.patch(
            self.url,
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Editable Area")

    def test_rename_to_same_name(self):
        payload = {"name": "Editable Area"}
        self.client.force_authenticate(self.creator)
        response = self.client.patch(
            self.url,
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Editable Area")

    def test_rename_invalid_payload(self):
        payload = {"planning_area": "Editable Area"}
        self.client.force_authenticate(self.creator)
        response = self.client.patch(
            self.url,
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Editable Area")

    def test_rename_using_put(self):
        self.client.force_authenticate(self.creator)
        response = self.client.put(
            self.url,
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.name, "Renamed Area")

    def test_rename_updates_latest_updated_ordering(self):
        other_area = PlanningAreaFactory.create(
            user=self.creator,
            name="Secondary Area",
            owners=[self.creator, self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )

        list_url = reverse("api:planning:planningareas-list")
        self.client.force_authenticate(self.creator)
        initial_response = self.client.get(list_url, {}, format="json")
        self.assertEqual(initial_response.status_code, status.HTTP_200_OK)
        initial_results = initial_response.json()["results"]
        initial_ids = [pa["id"] for pa in initial_results]
        self.assertEqual(initial_ids[:2], [other_area.id, self.planning_area.id])

        rename_response = self.client.patch(self.url, self.payload, format="json")
        self.assertEqual(rename_response.status_code, status.HTTP_200_OK)
        reordered_response = self.client.get(
            list_url + "?ordering=-latest_updated", {}, format="json"
        )
        self.assertEqual(reordered_response.status_code, status.HTTP_200_OK)
        reordered_results = reordered_response.json()["results"]
        self.assertEqual(reordered_results[0]["id"], self.planning_area.id)


class DeletePlanningAreaTest(APITestCase):
    def setUp(self):
        self.creator = UserFactory.create()
        self.owner = UserFactory()
        self.collaborator = UserFactory()
        self.viewer = UserFactory()
        self.planning_area = PlanningAreaFactory.create(
            user=self.creator,
            name="Deletable Area",
            owners=[self.creator, self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )

    def test_delete_planning_area_as_creator(self):
        self.client.force_authenticate(self.creator)
        response = self.client.delete(
            reverse(
                "api:planning:planningareas-detail",
                kwargs={"pk": self.planning_area.pk},
            ),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(PlanningArea.objects.count(), 0)

    def test_delete_planning_area_as_owner(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(
            reverse(
                "api:planning:planningareas-detail",
                kwargs={"pk": self.planning_area.pk},
            ),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_planning_area_as_collaborator(self):
        self.client.force_authenticate(self.collaborator)
        response = self.client.delete(
            reverse(
                "api:planning:planningareas-detail",
                kwargs={"pk": self.planning_area.pk},
            ),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_planning_area_as_viewer(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.delete(
            reverse(
                "api:planning:planningareas-detail",
                kwargs={"pk": self.planning_area.pk},
            ),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_planning_area_unauthenticated(self):
        response = self.client.delete(
            reverse(
                "api:planning:planningareas-detail",
                kwargs={"pk": self.planning_area.pk},
            ),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_nonexistent_planning_area(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(
            reverse(
                "api:planning:planningareas-detail",
                kwargs={"pk": 9999},
            ),
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(PlanningArea.objects.count(), 1)


class CreateScenariosFromUpload(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory.create()
        self.la_geojson = json.dumps(_load_geojson_fixture("around_LA.geojson"))

        self.planning_area = PlanningAreaFactory(
            user=self.owner_user, geometry=MultiPolygon(GEOSGeometry(self.la_geojson))
        )
        self.pasadena_pomona = _load_geojson_fixture("near_pasadena_pomona.geojson")
        self.sandiego = _load_geojson_fixture("sandiego.geojson")
        self.riverside = _load_geojson_fixture("riverside.geojson")

    def test_confirm_permissions_required(self):
        payload = {
            "geometry": json.dumps(self.riverside),
            "name": "new scenario",
            "stand_size": "LARGE",
            "planning_area": self.planning_area.pk,
        }
        response = self.client.post(
            reverse(
                "api:planning:scenarios-upload-shapefiles",
            ),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_create_from_multi_feature_shpjs(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": json.dumps(self.pasadena_pomona),
            "name": "new scenario",
            "stand_size": "LARGE",
            "planning_area": self.planning_area.pk,
        }
        response = self.client.post(
            reverse(
                "api:planning:scenarios-upload-shapefiles",
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response_data["project_areas"]), 2)
        self.assertEqual(response_data["origin"], "USER")

        result_record = ScenarioResult.objects.get(scenario=response_data["id"])
        # assert that we have multiple features
        self.assertEqual(len(result_record.result["features"]), 2)

        # test that all features contain the expected properties
        for f in result_record.result["features"]:
            self.assertIn("project_id", f["properties"])

    def test_create_uncontained_geometry(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": json.dumps(self.sandiego),
            "name": "new scenario",
            "stand_size": "LARGE",
            "planning_area": self.planning_area.pk,
        }
        response = self.client.post(
            reverse(
                "api:planning:scenarios-upload-shapefiles",
            ),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        expected_error = {
            "detail": "Validation error.",
            "errors": {
                "global": [
                    "The uploaded geometry is not within the selected planning area."
                ]
            },
        }
        self.assertEqual(response.json(), expected_error)

    def test_create_with_duplicate_names(self):
        self.client.force_authenticate(self.owner_user)
        payload = {
            "geometry": json.dumps(self.riverside),
            "name": "Some New Scenario",
            "stand_size": "SMALL",
            "planning_area": self.planning_area.pk,
        }
        response = self.client.post(
            reverse(
                "api:planning:scenarios-upload-shapefiles",
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response_data["project_areas"]), 1)

        _payload2 = {
            "geometry": json.dumps(self.riverside),
            "name": "Some New Scenario",
            "stand_size": "SMALL",
            "planning_area": self.planning_area.pk,
        }
        response = self.client.post(
            reverse(
                "api:planning:scenarios-upload-shapefiles",
            ),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        expected_error = {
            "detail": "Validation error.",
            "errors": {"name": ["A scenario with this name already exists."]},
        }
        self.assertEqual(response.json(), expected_error)


class TreatmentGoalViewSetTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create(username="testuser")
        self.client.force_authenticate(self.user)
        # Create two overlapping polygons
        self.mpoly1 = GEOSGeometry(
            "MULTIPOLYGON(((0 0, 1 0, 1 1, 0 1, 0 0)))", srid=4269
        )
        self.mpoly2 = GEOSGeometry(
            "MULTIPOLYGON(((0.5 0.5, 1.5 0.5, 1.5 1.5, 0.5 1.5, 0.5 0.5)))", srid=4269
        )
        self.mpoly3 = GEOSGeometry(
            "MULTIPOLYGON(((2 2, 3 2, 3 3, 2 3, 2 2)))", srid=4269
        )
        self.poly1 = GEOSGeometry("POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))", srid=4269)
        self.poly2 = GEOSGeometry(
            "POLYGON((0.5 0.5, 1.5 0.5, 1.5 1.5, 0.5 1.5, 0.5 0.5))", srid=4269
        )
        self.poly3 = GEOSGeometry("POLYGON((2 2, 3 2, 3 3, 2 3, 2 2))", srid=4269)
        self.dl1 = DataLayerFactory.create(
            name="Layer 1",
            geometry=self.poly1,
            outline=self.mpoly1,
        )
        self.dl2 = DataLayerFactory.create(
            name="Layer 2",
            geometry=self.poly2,
            outline=self.mpoly2,
        )
        self.dl3 = DataLayerFactory.create(
            name="Layer 3",
            geometry=self.poly3,
            outline=self.mpoly3,
        )

        self.markdown_description = (
            "# This is a h1\n"
            "## This is a h2\n"
            "### This is a h3\n"
            "This is a paragraph with a [link](https://planscape.org)"
        )

        self.html_description = (
            "<h1>This is a h1</h1>\n"
            "<h2>This is a h2</h2>\n"
            "<h3>This is a h3</h3>\n"
            '<p>This is a paragraph with a <a href="https://planscape.org">link</a></p>'
        )

        ca_group = TreatmentGoalGroup.CALIFORNIA_PLANNING_METRICS

        TreatmentGoal.objects.all().delete()  # cleanup any existing records added on migrations

        self.first_treatment_goal = TreatmentGoalFactory.create(
            name="First",
            description=self.markdown_description,
            category=TreatmentGoalCategory.BIODIVERSITY,
            geometry=MultiPolygon([self.poly1.intersection(self.poly2)]),
            group=ca_group,
        )
        self.treatment_goals = TreatmentGoalFactory.create_batch(
            10,
            geometry=self.mpoly3,
            group=ca_group,
        )
        self.inactive_treatment_goal = TreatmentGoalFactory.create(
            active=False,
            group=ca_group,
        )
        self.usage1 = TreatmentGoalUsesDataLayer.objects.create(
            usage_type="PRIORITY",
            datalayer=self.dl1,
            treatment_goal=self.first_treatment_goal,
        )
        self.usage2 = TreatmentGoalUsesDataLayer.objects.create(
            usage_type="THRESHOLD",
            datalayer=self.dl2,
            treatment_goal=self.first_treatment_goal,
        )

    def test_list_treatment_goals(self):
        response = self.client.get(
            reverse("api:planning:treatment-goals-list"),
            content_type="application/json",
        )
        treatment_goals = json.loads(response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(treatment_goals), 11)
        first_treatment_goal = treatment_goals[0]
        self.assertEqual(first_treatment_goal["name"], self.first_treatment_goal.name)
        self.assertEqual(first_treatment_goal["id"], self.first_treatment_goal.id)
        self.assertEqual(first_treatment_goal["description"], self.html_description)
        self.assertEqual(
            first_treatment_goal["category"], self.first_treatment_goal.category
        )
        self.assertEqual(
            first_treatment_goal["category_text"],
            self.first_treatment_goal.category.label,
        )
        self.assertEqual(first_treatment_goal["group"], self.first_treatment_goal.group)
        self.assertEqual(
            first_treatment_goal["group_text"],
            TreatmentGoalGroup(self.first_treatment_goal.group).label,
        )
        self.assertCountEqual(
            first_treatment_goal["usage_types"],
            [
                {"usage_type": "PRIORITY", "datalayer": "Layer 1"},
                {"usage_type": "THRESHOLD", "datalayer": "Layer 2"},
            ],
        )

    def test_detail_treatment_goal(self):
        response = self.client.get(
            reverse(
                "api:planning:treatment-goals-detail",
                args=[self.first_treatment_goal.id],
            ),
            content_type="application/json",
        )
        treatment_goal = json.loads(response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(treatment_goal["name"], self.first_treatment_goal.name)
        self.assertEqual(treatment_goal["id"], self.first_treatment_goal.id)
        self.assertEqual(treatment_goal["description"], self.html_description)
        self.assertEqual(treatment_goal["category"], self.first_treatment_goal.category)
        self.assertEqual(
            treatment_goal["category_text"], self.first_treatment_goal.category.label
        )
        self.assertEqual(treatment_goal["group"], self.first_treatment_goal.group)
        self.assertEqual(
            treatment_goal["group_text"],
            TreatmentGoalGroup(self.first_treatment_goal.group).label,
        )

    def test_detail_inactive_treatment_goal(self):
        response = self.client.get(
            reverse(
                "api:planning:treatment-goals-detail",
                args=[self.inactive_treatment_goal.id],
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_treatment_goals_with_filter(self):
        intersection = self.poly1.intersection(self.poly2).buffer(-0.00001)
        planning_area = PlanningAreaFactory.create(
            user=self.user, geometry=MultiPolygon([intersection])
        )
        url = (
            reverse("api:planning:treatment-goals-list")
            + f"?planning_area={planning_area.pk}"
        )
        response = self.client.get(
            url,
            content_type="application/json",
        )
        treatment_goals = json.loads(response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(treatment_goals), 1)
