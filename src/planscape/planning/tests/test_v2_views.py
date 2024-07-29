import json
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from collaboration.tests.helpers import create_collaborator_record
from collaboration.models import Permissions, Role
from planning.models import RegionChoices
from planning.tests.helpers import (
    _create_planning_area,
    _create_multiple_planningareas,
    _create_scenario,
    reset_permissions,
)


class CreatorsTest(APITransactionTestCase):
    def setUp(self):
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.user_a = User.objects.create(
            username="user a", first_name="user", last_name="a"
        )
        self.user_a.set_password("12345")
        self.user_a.save()
        self.user_b = User.objects.create(
            username="user b", first_name="user", last_name="b"
        )
        self.user_b.set_password("12345")
        self.user_b.save()
        self.user_c = User.objects.create(
            username="user c", first_name="user", last_name="c"
        )
        self.user_c.set_password("12345")
        self.user_c.save()
        self.user_d = User.objects.create(
            username="user d", first_name="user", last_name="d"
        )
        self.user_d.set_password("12345")
        self.user_d.save()
        self.user_e = User.objects.create(
            username="user e", first_name="user", last_name="e"
        )
        self.user_e.set_password("12345")
        self.user_e.save()
        self.test_pa_user_a = _create_multiple_planningareas(
            11,
            self.user_a,
            "usera plan",
            stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.test_pa_user_b = _create_multiple_planningareas(
            11,
            self.user_b,
            "userb plan",
            stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )

        # Note: No areas for user_c

        self.test_pa_user_d = _create_multiple_planningareas(
            11,
            self.user_d,
            "userd plan",
            stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.test_pa_user_e = _create_multiple_planningareas(
            11,
            self.user_e,
            "usere plan",
            stored_geometry,
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
        create_collaborator_record(
            self.user_b,
            self.user_a,
            self.test_pa_user_b[0],
            Role.COLLABORATOR,
        )
        create_collaborator_record(
            self.user_e,
            self.user_a,
            self.test_pa_user_e[0],
            Role.COLLABORATOR,
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
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        self.user2 = User.objects.create(username="otherowner")
        self.user2.set_password("12345")
        self.user2.save()

        self.emptyuser = User.objects.create(username="emptyuser")
        self.emptyuser.set_password("12345")
        self.emptyuser.save()

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.test_pa_sn = _create_multiple_planningareas(
            10,
            self.user,
            "test plan",
            stored_geometry,
            region_name=RegionChoices.SIERRA_NEVADA,
        )
        self.test_pa_cc = _create_multiple_planningareas(
            11,
            self.user,
            "test plan",
            stored_geometry,
            region_name=RegionChoices.CENTRAL_COAST,
        )
        self.test_pa_sc = _create_multiple_planningareas(
            12,
            self.user,
            "test plan",
            stored_geometry,
            region_name=RegionChoices.SOUTHERN_CALIFORNIA,
        )
        self.test_pa_nc = _create_multiple_planningareas(
            13,
            self.user,
            "test plan",
            stored_geometry,
            region_name=RegionChoices.NORTHERN_CALIFORNIA,
        )
        self.test_pa_user2_nc = _create_multiple_planningareas(
            13,
            self.user2,
            "other user plan",
            stored_geometry,
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

        self.scenario1_1 = _create_scenario(
            self.planning_area1, "test pa1 scenario1 ", "{}", self.user, ""
        )
        self.scenario1_2 = _create_scenario(
            self.planning_area1, "test pa1 scenario2", "{}", self.user, ""
        )
        self.scenario1_3 = _create_scenario(
            self.planning_area1, "test pa1 scenario3", "{}", self.user, ""
        )
        self.scenario3_1 = _create_scenario(
            self.planning_area3, "test pa3 scenario1", "{}", self.user, ""
        )
        self.scenario4_1 = _create_scenario(
            self.planning_area4, "test pa4 scenario1 ", "{}", self.user, ""
        )
        self.scenario4_2 = _create_scenario(
            self.planning_area4, "test pa4 scenario2", "{}", self.user, ""
        )
        self.scenario4_3 = _create_scenario(
            self.planning_area4, "test pa4 scenario3", "{}", self.user, ""
        )

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
        _create_multiple_planningareas(10, self.user, "invented name", stored_geometry)
        _create_multiple_planningareas(10, self.user, "created name", stored_geometry)

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
            create_collaborator_record(
                self.user,
                self.user2,
                pa,
                Role.COLLABORATOR,
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
        create_collaborator_record(
            self.user2,
            self.user,
            self.test_pa_user2_nc[0],
            Role.COLLABORATOR,
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


class ListPlanningAreaSortingTest(APITransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create(username="testuser")
        self.user1.set_password("12345")
        self.user1.save()

        self.user2 = User.objects.create(username="otherowner")
        self.user2.set_password("12345")
        self.user2.save()

        self.emptyuser = User.objects.create(username="emptyuser")
        self.emptyuser.set_password("12345")
        self.emptyuser.save()

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

        self.pa1 = _create_planning_area(
            self.user1, "Area D", geo1, region_name=RegionChoices.CENTRAL_COAST
        )
        self.pa2 = _create_planning_area(
            self.user1, "Area E", geo3, region_name=RegionChoices.SIERRA_NEVADA
        )
        self.pa3 = _create_planning_area(
            self.user1, "Area C", geo4, region_name=RegionChoices.SOUTHERN_CALIFORNIA
        )
        self.pa4 = _create_planning_area(
            self.user1, "Area F", geo2, region_name=RegionChoices.NORTHERN_CALIFORNIA
        )
        self.pa5 = _create_planning_area(
            self.user1, "Area B", geo3, region_name=RegionChoices.CENTRAL_COAST
        )
        self.pa6 = _create_planning_area(
            self.user1, "Area A", geo3, region_name=RegionChoices.SIERRA_NEVADA
        )

        self.pa7 = _create_planning_area(
            self.user2, "Area G", geo1, region_name=RegionChoices.CENTRAL_COAST
        )
        self.pa8 = _create_planning_area(
            self.user2, "Area H", geo2, region_name=RegionChoices.NORTHERN_CALIFORNIA
        )
        self.pa9 = _create_planning_area(
            self.user2, "Area I", geo3, region_name=RegionChoices.SIERRA_NEVADA
        )
        self.pa10 = _create_planning_area(
            self.user2, "Area J", geo4, region_name=RegionChoices.CENTRAL_COAST
        )

        self.scenario1_1 = _create_scenario(
            self.pa1, "test pa1 scenario1 ", "{}", self.user1, ""
        )
        self.scenario1_2 = _create_scenario(
            self.pa1, "test pa1 scenario2", "{}", self.user1, ""
        )
        self.scenario1_3 = _create_scenario(
            self.pa1, "test pa1 scenario3", "{}", self.user1, ""
        )
        self.scenario3_1 = _create_scenario(
            self.pa3, "test pa3 scenario1", "{}", self.user1, ""
        )
        self.scenario4_1 = _create_scenario(
            self.pa4, "test pa4 scenario1 ", "{}", self.user1, ""
        )
        self.scenario4_2 = _create_scenario(
            self.pa4, "test pa4 scenario2", "{}", self.user1, ""
        )
        self.scenario4_3 = _create_scenario(
            self.pa4, "test pa4 scenario3", "{}", self.user1, ""
        )

        # user1 can see all of user2 PA records as a collaborator
        create_collaborator_record(self.user2, self.user1, self.pa7, Role.COLLABORATOR)
        create_collaborator_record(self.user2, self.user1, self.pa8, Role.COLLABORATOR)
        create_collaborator_record(self.user2, self.user1, self.pa9, Role.COLLABORATOR)
        create_collaborator_record(self.user2, self.user1, self.pa10, Role.COLLABORATOR)

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

    def test_list_planning_areas_sort_by_region_name(self):
        self.client.force_authenticate(self.user1)
        query_params = {"ordering": "region_name"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        region_names = []
        for item in planning_areas["results"]:
            region_names.append(item["region_name"])
        expected_region_names = [
            "Central Coast",
            "Central Coast",
            "Central Coast",
            "Central Coast",
            "Northern California",
            "Northern California",
            "Sierra Nevada",
            "Sierra Nevada",
            "Sierra Nevada",
            "Southern California",
        ]
        self.assertListEqual(region_names, expected_region_names)

    def test_list_planning_areas_desc_sort_by_region_name(self):
        self.client.force_authenticate(self.user1)
        query_params = {"ordering": "-region_name"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        region_names = []
        for item in planning_areas["results"]:
            region_names.append(item["region_name"])
        expected_region_names = [
            "Southern California",
            "Sierra Nevada",
            "Sierra Nevada",
            "Sierra Nevada",
            "Northern California",
            "Northern California",
            "Central Coast",
            "Central Coast",
            "Central Coast",
            "Central Coast",
        ]
        self.assertListEqual(region_names, expected_region_names)

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

    def test_list_planning_areas_sort_by_scenario_count_region_name(self):
        self.client.force_authenticate(self.user1)
        query_params = {"ordering": "scenario_count, region_name"}
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        scenario_counts = []
        region_names = []
        for item in planning_areas["results"]:
            scenario_counts.append(item["scenario_count"])
            region_names.append(item["region_name"])
        expected_scenario_counts = [0, 0, 0, 0, 0, 0, 0, 1, 3, 3]
        expected_region_names = [
            "Central Coast",
            "Central Coast",
            "Central Coast",
            "Northern California",
            "Sierra Nevada",
            "Sierra Nevada",
            "Sierra Nevada",
            "Southern California",
            "Central Coast",
            "Northern California",
        ]
        self.assertListEqual(scenario_counts, expected_scenario_counts)
        self.assertListEqual(region_names, expected_region_names)

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
        expected_acres = [
            56338.09165393878,
            56338.09165393878,
            29674594.93297612,
            29674594.93297612,
            213997881.85468292,
            213997881.85468292,
            213997881.85468292,
            213997881.85468292,
            525377875.28772503,
            525377875.28772503,
        ]
        self.assertListEqual(acres, expected_acres)


class ListPlanningAreasWithPermissionsTest(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()

        self.creator_user = User.objects.create(
            username="makerofthings",
            email="creator@test.test",
            first_name="Creaty",
            last_name="Creatington",
        )
        self.creator_user.set_password("12345")
        self.creator_user.save()

        self.collab_user = User.objects.create(
            username="collaboratorofthings",
            email="collab@test.test",
            first_name="Collaby",
            last_name="Collabington",
        )
        self.collab_user.set_password("12345")
        self.collab_user.save()

        self.viewer_user = User.objects.create(
            username="viewerofthings",
            email="viewer@test.test",
            first_name="Viewy",
            last_name="Viewington",
        )
        self.viewer_user.set_password("12345")
        self.viewer_user.save()

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.planning_area_w_collab = _create_planning_area(
            self.creator_user, "Shared with Collaborator", stored_geometry
        )
        self.planning_area_w_viewer = _create_planning_area(
            self.creator_user, "Area Shared with Viewer", stored_geometry
        )
        self.planning_area_notshared = _create_planning_area(
            self.creator_user, "Not Shared Area", stored_geometry
        )
        create_collaborator_record(
            self.creator_user,
            self.collab_user,
            self.planning_area_w_collab,
            Role.COLLABORATOR,
        )
        create_collaborator_record(
            self.creator_user,
            self.viewer_user,
            self.planning_area_w_viewer,
            Role.VIEWER,
        )

    def test_planningareas_list_for_creator(self):
        self.client.force_authenticate(self.creator_user)
        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        expected_perms = [
            "view_planningarea",
            "view_scenario",
            "add_scenario",
            "change_scenario",
            "view_collaborator",
            "add_collaborator",
            "delete_collaborator",
            "change_collaborator",
        ]

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
            ["view_planningarea", "view_scenario", "add_scenario"],
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
        self.assertCountEqual(
            the_area["permissions"], ["view_planningarea", "view_scenario"]
        )
