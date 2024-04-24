import json
import os
from unittest import mock
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from collaboration.tests.helpers import create_collaborator_record
from collaboration.models import Permissions, Role
from planning.models import Scenario, ScenarioResult, ScenarioResultStatus
from planning.tests.helpers import (
    _create_planning_area,
    _create_multiple_planningareas,
    _create_scenario,
    _create_test_user_set,
    _create_multiple_scenarios,
    reset_permissions,
)


# v2 -
class GetPlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.test_planningareas = _create_multiple_planningareas(
            50, self.user, "test plan", stored_geometry
        )

        self.planning_area1 = self.test_planningareas[0]
        self.planning_area2 = self.test_planningareas[1]
        self.planning_area3 = self.test_planningareas[2]
        self.planning_area4 = self.test_planningareas[3]
        self.planning_area5 = self.test_planningareas[4]

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

        self.user2 = User.objects.create(username="otherowner")
        self.user2.set_password("12345")
        self.user2.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area6 = _create_planning_area(
            self.user2, "test plan-manual6", stored_geometry
        )

        self.central_coast_area = self.test_planningareas[6]
        self.central_coast_area.region_name = "central-coast"
        self.central_coast_area.save()

        self.emptyuser = User.objects.create(username="emptyuser")
        self.emptyuser.set_password("12345")
        self.emptyuser.save()

    def test_list_planning_areas(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("planning:get_planningareas"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )
        self.assertEqual(planning_areas["count"], 50)
        self.assertEqual(len(planning_areas["results"]), 20)

    def test_list_planning_areas_page3(self):
        self.client.force_authenticate(self.user)
        query_params = {"page": "3"}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )
        self.assertEqual(planning_areas["count"], 50)
        # last page should have 10 items
        self.assertEqual(len(planning_areas["results"]), 10)

    def test_filter_planning_areas_by_name(self):
        self.client.force_authenticate(self.user)
        query_params = {"name": "10"}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 1)  # total results
        self.assertEqual(len(planning_areas["results"]), 1)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_list_planning_areas_ordered(self):
        ## This tests the logic for ordering areas by most recent scenario date,
        #   or by the plan's most recent update, if it has no scenario

        ## Results follow this logic:
        # plan4 - 2010-12-01 00:01:01-05 -- from most recent scenario
        # plan5 - 2010-11-01 00:01:01-05 -- no scenarios
        # plan3 - 2010-10-01 00:01:01-05 -- from most recent scenario
        # plan1 - 2010-09-01 00:01:01-05 -- from most recent scenario
        # plan2 - 2010-02-01 00:01:01-05 -- no scenarios

        scenario_update_overrides = [
            ["2010-07-01 00:01:01-05", self.scenario1_1.id],
            ["2010-08-01 00:01:01-05", self.scenario1_2.id],
            ["2010-09-01 00:01:01-05", self.scenario1_3.id],
            ["2010-10-01 00:01:01-05", self.scenario3_1.id],
            ["2010-11-01 00:01:01-05", self.scenario4_1.id],
            ["2010-12-01 00:01:01-05", self.scenario4_2.id],
            ["2010-04-03 00:01:01-05", self.scenario4_3.id],
        ]
        # using raw updates here, to override django's autoupdate of updated_at field
        with connection.cursor() as cursor:
            for so in scenario_update_overrides:
                cursor.execute(
                    "UPDATE planning_scenario SET updated_at = %s WHERE id = %s", so
                )

        # change all updated_at to be uniform, for all test records
        with connection.cursor() as cursor:
            for p in self.test_planningareas:
                cursor.execute(
                    f"UPDATE planning_planningarea SET updated_at = '2009-01-01' WHERE id = {p.id}"
                )

        # then change a few to be specific
        planning_area_update_overrides = [
            ["2010-01-01 00:01:01-05", self.planning_area1.id],
            ["2010-02-01 00:01:01-05", self.planning_area2.id],
            ["2010-03-01 00:01:01-05", self.planning_area3.id],
            ["2010-04-01 00:01:01-05", self.planning_area4.id],
            ["2010-11-01 00:01:01-05", self.planning_area5.id],
            ["2010-06-01 00:01:01-05", self.planning_area6.id],
        ]
        # using raw updates here, to override django's autoupdate of updated_at field
        with connection.cursor() as cursor:
            for p in planning_area_update_overrides:
                cursor.execute(
                    "UPDATE planning_planningarea SET updated_at = %s WHERE id = %s", p
                )

        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("planning:get_planningareas"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        updates_list = [
            (pa["name"], pa["latest_updated"]) for pa in planning_areas["results"][:5]
        ]
        self.assertEqual(
            updates_list,
            [
                ("test plan 3", "2010-12-01T05:01:01Z"),
                ("test plan 4", "2010-11-01T05:01:01Z"),
                ("test plan 2", "2010-10-01T05:01:01Z"),
                ("test plan 0", "2010-09-01T05:01:01Z"),
                ("test plan 1", "2010-02-01T05:01:01Z"),
            ],
        )

    def test_list_planning_areas_sort_by_scenario_count(self):
        self.client.force_authenticate(self.user)
        query_params = {"sortby": "scenario_count", "page": 3}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(len(planning_areas["results"]), 10)

        result_scenario_counts = []
        for item in planning_areas["results"]:
            result_scenario_counts.append(item["scenario_count"])
        expected_scenario_counts = [0, 0, 0, 0, 0, 0, 0, 1, 3, 3]
        self.assertListEqual(result_scenario_counts, expected_scenario_counts)

    def test_list_planning_areas_sort_by_name(self):
        self.client.force_authenticate(self.user)
        query_params = {"sortby": "name"}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        area_names = []
        for item in planning_areas["results"]:
            area_names.append(item["name"])
        expected_names = [
            "test plan 0",
            "test plan 1",
            "test plan 10",
            "test plan 11",
            "test plan 12",
            "test plan 13",
            "test plan 14",
            "test plan 15",
            "test plan 16",
            "test plan 17",
            "test plan 18",
            "test plan 19",
            "test plan 2",
            "test plan 20",
            "test plan 21",
            "test plan 22",
            "test plan 23",
            "test plan 24",
            "test plan 25",
            "test plan 26",
        ]

        self.assertEqual(len(planning_areas["results"]), 20)
        self.assertListEqual(area_names, expected_names)

    def test_filter_planning_areas_by_region1(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "sierra-nevada"}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 49)  # total results
        self.assertEqual(len(planning_areas["results"]), 20)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_region2(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "central-coast"}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 1)  # total results
        self.assertEqual(len(planning_areas["results"]), 1)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_multiple_regions(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "central-coast,sierra-nevada"}
        response = self.client.get(
            reverse("planning:get_planningareas"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 50)  # total results
        self.assertEqual(len(planning_areas["results"]), 20)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_list_planning_areas_not_logged_in(self):
        response = self.client.get(
            reverse("planning:get_planningareas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    def test_list_planning_areas_empty_user(self):
        self.client.force_authenticate(self.emptyuser)
        response = self.client.get(
            reverse("planning:get_planningareas"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 0)


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
            reverse("planning:get_planningareas"),
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
            reverse("planning:get_planningareas"),
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
            reverse("planning:get_planningareas"),
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
