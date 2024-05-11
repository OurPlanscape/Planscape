import json
import os
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from rest_framework_simplejwt.tokens import RefreshToken

from collaboration.tests.helpers import create_collaborator_record
from collaboration.models import Permissions, Role
from planning.geometry import coerce_geojson
from planning.models import PlanningArea
from planning.tests.helpers import (
    _create_planning_area,
    _create_multiple_planningareas,
    _create_scenario,
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
            120, self.user, "test plan", stored_geometry
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
            reverse("planning:planningareas-list"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )
        self.assertEqual(planning_areas["count"], 120)
        self.assertEqual(len(planning_areas["results"]), 50)

    def test_list_planning_areas_offset(self):
        self.client.force_authenticate(self.user)
        query_params = {"offset": "100"}
        response = self.client.get(
            reverse("planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )
        self.assertEqual(planning_areas["count"], 120)
        self.assertEqual(len(planning_areas["results"]), 20)

    def test_filter_planning_areas_by_partial_name(self):
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        _create_multiple_planningareas(10, self.user, "invented name", stored_geometry)
        _create_multiple_planningareas(10, self.user, "created name", stored_geometry)

        self.client.force_authenticate(self.user)
        query_params = {"name": "ted"}
        response = self.client.get(
            reverse("planning:planningareas-list"),
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

    def test_list_planning_areas_sort_by_name(self):
        geo = GEOSGeometry(json.dumps(self.geometry))

        _create_planning_area(self.user, "Area D", geo)
        _create_planning_area(self.user, "Area E", geo)
        _create_planning_area(self.user, "Area C", geo)
        _create_planning_area(self.user, "Area F", geo)
        _create_planning_area(self.user, "Area B", geo)
        _create_planning_area(self.user, "Area A", geo)

        self.client.force_authenticate(self.user)
        query_params = {"ordering": "name", "limit": 6}
        response = self.client.get(
            reverse("planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        area_names = []
        for item in planning_areas["results"]:
            area_names.append(item["name"])
        expected_names = ["Area A", "Area B", "Area C", "Area D", "Area E", "Area F"]
        self.assertListEqual(area_names, expected_names)

    def test_filter_planning_areas_by_region1(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "sierra-nevada"}
        response = self.client.get(
            reverse("planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 119)  # total results
        self.assertEqual(len(planning_areas["results"]), 50)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_filter_planning_areas_by_region2(self):
        self.client.force_authenticate(self.user)
        query_params = {"region_name": "central-coast"}
        response = self.client.get(
            reverse("planning:planningareas-list"),
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
        query_params = {"region_name": ["central-coast", "sierra-nevada"]}
        response = self.client.get(
            reverse("planning:planningareas-list"),
            query_params,
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 120)  # total results
        self.assertEqual(len(planning_areas["results"]), 50)
        self.assertListEqual(
            list(planning_areas.keys()), ["count", "next", "previous", "results"]
        )

    def test_list_planning_areas_not_logged_in(self):
        response = self.client.get(
            reverse("planning:planningareas-list"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    def test_list_planning_areas_empty_user(self):
        self.client.force_authenticate(self.emptyuser)
        response = self.client.get(
            reverse("planning:planningareas-list"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(planning_areas["count"], 0)


class CreatePlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        self.token = RefreshToken.for_user(self.user).access_token

        self.geometry = {
            "features": [
                {
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]],
                        ],
                    }
                }
            ]
        }
        self.multipolygon_geometry = {
            "features": [
                {
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [
                            [
                                [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]],
                            ]
                        ],
                    }
                }
            ]
        }
        self.notes = "Inconcievable! \
              You keep using that word. \
              I do not think it means what you think it means."

    def test_create_planning_area(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
                "notes": self.notes,
            }
        )

        response = self.client.post(
            reverse("planning:planningareas-list"),
            data=payload,
            content_type="application/json",
        )
        data = response.json()

        # self.assertEqual(response.status_code, 200)
        planning_area = PlanningArea.objects.all().first()
        self.assertEqual(PlanningArea.objects.all().count(), 1)
        self.assertEqual(planning_area.region_name, "sierra-nevada")
        self.assertTrue(planning_area.geometry.equals(coerce_geojson(self.geometry)))
        self.assertEqual(planning_area.notes, self.notes)
        self.assertEqual(planning_area.name, "test plan")
        self.assertEqual(planning_area.user.pk, self.user.pk)
        self.assertIn("id", data)

    def test_create_planning_area_no_notes(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        data = response.json()
        planning_area = PlanningArea.objects.all().first()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.all().count(), 1)
        self.assertEqual(data["id"], planning_area.id)
        self.assertEqual(planning_area.region_name, "sierra-nevada")
        self.assertTrue(planning_area.geometry.equals(coerce_geojson(self.geometry)))
        self.assertIn("id", data)

    def test_create_planning_area_multipolygon(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Southern California",
                "geometry": self.multipolygon_geometry,
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        data = response.json()
        planning_area = PlanningArea.objects.all().first()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.all().count(), 1)
        self.assertEqual(planning_area.region_name, "southern-california")
        self.assertTrue(
            planning_area.geometry.equals(coerce_geojson(self.multipolygon_geometry))
        )
        self.assertIn("id", data)

    def test_missing_user(self):
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_missing_name(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {"region_name": "Sierra Nevada", "geometry": self.geometry}
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"name": "test plan", "region_name": "Sierra Nevada"})
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry_features(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {"name": "test plan", "region_name": "Sierra Nevada", "geometry": {}}
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_empty_features(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": {"features": []},
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_geometry(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": {"features": [{"type": "Point", "coordinates": [1, 2]}]},
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_polygon(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": {"features": [{"geometry": {"type": "Polygon"}}]},
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_region_name(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "north_coast_inland",
                "geometry": {
                    "features": [
                        {
                            "geometry": {
                                "type": "MultiPolygon",
                                "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
                            }
                        }
                    ]
                },
            }
        )
        response = self.client.post(
            reverse("planning:planningareas-list"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


class ListPlanningAreasWithPermissionsTest(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()

        self.planningareas_list_url = ""

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
            reverse("planning:planningareas-list"),
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
            reverse("planning:planningareas-list"),
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
            reverse("planning:planningareas-list"),
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


class DeletePlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.owner_user = User.objects.create(
            username="area_owner",
            first_name="Oliver",
            last_name="Owner",
            email="owner1@test.test",
        )
        self.owner_user.set_password("12345")
        self.owner_user.save()

        self.owner_user2 = User.objects.create(
            username="area2_owner",
            first_name="Olga",
            last_name="Owner",
            email="owner2@test.test",
        )
        self.owner_user2.set_password("12345")
        self.owner_user2.save()

        self.collab_user = User.objects.create(
            username="area_collab",
            first_name="Chris",
            last_name="Collab",
            email="collab@test.test",
        )
        self.collab_user.set_password("12345")
        self.collab_user.save()

        self.viewer_user = User.objects.create(
            username="area_viewer",
            first_name="Veronica",
            last_name="Viewer",
            email="viewer@test.test",
        )
        self.viewer_user.set_password("12345")
        self.viewer_user.save()

        self.unprivileged_user = User.objects.create(
            username="justauser",
            first_name="Ned",
            last_name="Nobody",
            email="user@test.test",
        )
        self.unprivileged_user.set_password("12345")
        self.unprivileged_user.save()

        self.planning_area1 = _create_planning_area(
            self.owner_user, "Owned by owner1-First", None
        )
        self.planning_area2 = _create_planning_area(
            self.owner_user, "Owned by owner1-Second", None
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area1, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area1, Role.VIEWER
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area2, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area2, Role.VIEWER
        )
        self.planning_area3 = _create_planning_area(
            self.owner_user2, "Owned by owner2-First", None
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area3, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area3, Role.VIEWER
        )

    def test_delete(self):
        self.client.force_authenticate(self.owner_user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        delete_url = reverse(
            "planning:planningareas-detail", kwargs={"pk": self.planning_area2.pk}
        )
        response = self.client.delete(
            delete_url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(PlanningArea.objects.count(), 2)

    def test_delete_user_not_logged_in(self):
        delete_url = reverse(
            "planning:planningareas-detail", kwargs={"pk": self.planning_area1.pk}
        )
        response = self.client.delete(
            delete_url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(PlanningArea.objects.count(), 3)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    # Deleteing someone else's plan silently performs nothing.
    def test_delete_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        delete_url = reverse(
            "planning:planningareas-detail", kwargs={"pk": self.planning_area3.pk}
        )
        response = self.client.delete(
            delete_url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(PlanningArea.objects.count(), 3)

    # TODO: we need a special endpoint for multiple deletions
    #
    #
    # Only the user's own plans are deleted.
    # def test_delete_multiple_planning_areas_with_some_owner_mismatches(self):
    #     self.client.force_authenticate(self.owner_user)
    #     self.assertEqual(PlanningArea.objects.count(), 3)
    #     planning_area_ids = [
    #         self.planning_area1.pk,
    #         self.planning_area2.pk,
    #         self.planning_area3.pk,
    #     ]
    #     payload = json.dumps({"id": planning_area_ids})
    #     response = self.client.post(
    #         reverse("planning:delete_planning_area"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(PlanningArea.objects.count(), 1)

    # def test_delete_multiple_planning_areas(self):
    #     self.client.force_authenticate(self.owner_user)
    #     self.assertEqual(PlanningArea.objects.count(), 3)
    #     planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
    #     payload = json.dumps({"id": planning_area_ids})
    #     response = self.client.post(
    #         reverse("planning:delete_planning_area"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertJSONEqual(response.content, {"id": planning_area_ids})
    #     self.assertEqual(PlanningArea.objects.count(), 1)

    # def test_delete_multiple_planning_areas_as_collab(self):
    #     self.client.force_authenticate(self.collab_user)
    #     self.assertEqual(PlanningArea.objects.count(), 3)
    #     planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
    #     payload = json.dumps({"id": planning_area_ids})
    #     response = self.client.post(
    #         reverse("planning:delete_planning_area"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertJSONEqual(response.content, {"id": planning_area_ids})
    #     self.assertEqual(PlanningArea.objects.count(), 3)

    # def test_delete_multiple_planning_areas_as_viewer(self):
    #     self.client.force_authenticate(self.viewer_user)
    #     self.assertEqual(PlanningArea.objects.count(), 3)
    #     planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
    #     payload = json.dumps({"id": planning_area_ids})
    #     response = self.client.post(
    #         reverse("planning:delete_planning_area"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertJSONEqual(response.content, {"id": planning_area_ids})
    #     # Viewer has no permission to delete, so all records should still exist
    #     self.assertEqual(PlanningArea.objects.count(), 3)
