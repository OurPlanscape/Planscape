import json
from unittest import mock
from django.db import connection
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APITransactionTestCase
from planning.models import PlanningArea, Scenario, ScenarioResult
from planning.tests.helpers import _create_planning_area, _create_scenario

# Yes, we are pulling in an internal just for testing that a geometry write happened.
from planning.views import _convert_polygon_to_multipolygon

# TODO: Add tests to ensure that users can't have planning areas with the same
# name in the same region, and that users can't have scenarios with the same
# name in the same planning area.


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
                        "coordinates": [[[1, 2], [2, 3], [3, 4], [1, 2]]],
                    }
                }
            ]
        }
        self.multipolygon_geometry = {
            "features": [
                {
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
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
            reverse("planning:create_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_areas = PlanningArea.objects.all()
        self.assertEqual(planning_areas.count(), 1)
        planning_area = planning_areas.first()
        assert planning_area is not None
        self.assertEqual(planning_area.region_name, "sierra-nevada")
        self.assertTrue(
            planning_area.geometry.equals(
                _convert_polygon_to_multipolygon(self.geometry)
            )
        )
        self.assertEqual(planning_area.notes, self.notes)
        self.assertEqual(planning_area.name, "test plan")
        self.assertEqual(planning_area.user.pk, self.user.pk)
        self.assertEqual(
            response.content, json.dumps({"id": planning_area.pk}).encode()
        )

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
            reverse("planning:create_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_areas = PlanningArea.objects.all()
        self.assertEqual(planning_areas.count(), 1)
        planning_area = planning_areas.first()
        assert planning_area is not None
        self.assertEqual(planning_area.region_name, "sierra-nevada")
        self.assertTrue(
            planning_area.geometry.equals(
                _convert_polygon_to_multipolygon(self.geometry)
            )
        )
        self.assertEqual(
            response.content, json.dumps({"id": planning_area.pk}).encode()
        )

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
            reverse("planning:create_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_areas = PlanningArea.objects.all()
        self.assertEqual(planning_areas.count(), 1)
        planning_area = planning_areas.first()
        assert planning_area is not None
        self.assertEqual(planning_area.region_name, "southern-california")
        self.assertTrue(
            planning_area.geometry.equals(
                _convert_polygon_to_multipolygon(self.multipolygon_geometry)
            )
        )
        self.assertEqual(
            response.content, json.dumps({"id": planning_area.pk}).encode()
        )

    def test_missing_user(self):
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            }
        )
        response = self.client.post(
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"name": "test plan", "region_name": "Sierra Nevada"})
        response = self.client.post(
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


class DeletePlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        self.planning_area1 = _create_planning_area(self.user, "test plan1", None)
        self.planning_area2 = _create_planning_area(self.user, "test plan2", None)

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()

        self.planning_area3 = _create_planning_area(self.user2, "test plan3", None)

    def test_delete(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        payload = json.dumps({"id": self.planning_area2.pk})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": [self.planning_area2.pk]}).encode()
        )
        self.assertEqual(PlanningArea.objects.count(), 2)

    def test_delete_user_not_logged_in(self):
        payload = json.dumps({"id": self.planning_area1.pk})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(PlanningArea.objects.count(), 3)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    # Deleteing someone else's plan silently performs nothing.
    def test_delete_wrong_user(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"id": self.planning_area3.pk})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 3)

    # Only the user's own plans are deleted.
    def test_delete_multiple_planning_areas_with_some_owner_mismatches(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [
            self.planning_area1.pk,
            self.planning_area2.pk,
            self.planning_area3.pk,
        ]
        payload = json.dumps({"id": planning_area_ids})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_multiple_planning_areas(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
        payload = json.dumps({"id": planning_area_ids})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": planning_area_ids}).encode()
        )
        self.assertEqual(PlanningArea.objects.count(), 1)


class UpdatePlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.old_name = "Westley"
        self.old_notes = "I know something you don't know."
        self.planning_area = _create_planning_area(
            self.user, self.old_name, storable_geometry, self.old_notes
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", storable_geometry, self.old_notes
        )

        self.new_name = "Inigo"
        self.new_notes = "I am not left handed."

    def test_update_notes_and_name(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "id": self.planning_area.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.post(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.planning_area.pk}).encode()
        )
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.new_name)
        self.assertEqual(planning_area.notes, self.new_notes)

    def test_update_notes_only(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"id": self.planning_area.pk, "notes": self.new_notes})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.planning_area.pk}).encode()
        )
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, self.new_notes)

    def test_update_name_only(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"id": self.planning_area.pk, "name": self.new_name})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.planning_area.pk}).encode()
        )
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.new_name)
        self.assertEqual(planning_area.notes, self.old_notes)

    def test_update_clear_notes(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"id": self.planning_area.pk, "notes": None})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.planning_area.pk}).encode()
        )
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, None)

    def test_update_empty_string_notes(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {"id": self.planning_area.pk, "notes": ""},
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.planning_area.pk}).encode()
        )
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, "")

    def test_update_nothing_to_update(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {"id": self.planning_area.pk},
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.planning_area.pk}).encode()
        )
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, self.old_notes)

    def test_update_not_logged_in(self):
        payload = json.dumps(
            {
                "id": self.planning_area.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_update_missing_id(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"name": self.new_name, "notes": self.new_notes})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(
            response.content, {"error": "No planning area ID provided"}
        )

    def test_update_wrong_user(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "id": self.planning_area2.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertRegex(str(response.content), r"Planning area not found for user.")

    def test_update_blank_name(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {"id": self.planning_area.pk, "name": None, "notes": self.new_notes}
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"name must be defined")

    def test_update_empty_string_name(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {"id": self.planning_area.pk, "name": "", "notes": self.new_notes}
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"name must be defined")


class GetPlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", storable_geometry
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", storable_geometry
        )

    def test_get_planning_area(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        returned_planning_area = response.json()
        self.assertEqual(returned_planning_area["name"], "test plan")
        self.assertEqual(returned_planning_area["region_name"], "Sierra Nevada")
        self.assertIsNotNone(returned_planning_area["created_at"])

    def test_get_nonexistent_planning_area(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": 9999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertRegex(str(response.content), r"Planning area not found for user.")

    def test_get_planning_area_wrong_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertRegex(str(response.content), r"Planning area not found for user.")

    def test_get_planning_area_not_logged_in(self):
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})


class ListPlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area1 = _create_planning_area(
            self.user, "test plan1", stored_geometry
        )
        self.planning_area2 = _create_planning_area(
            self.user, "test plan2", stored_geometry
        )
        self.planning_area3 = _create_planning_area(
            self.user, "test plan3", stored_geometry
        )
        self.planning_area4 = _create_planning_area(
            self.user, "test plan4", stored_geometry
        )
        self.planning_area5 = _create_planning_area(
            self.user, "test plan5", stored_geometry
        )
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

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area6 = _create_planning_area(
            self.user2, "test plan3", stored_geometry
        )

        self.emptyuser = User.objects.create(username="emptyuser")
        self.emptyuser.set_password("12345")
        self.emptyuser.save()

    def test_list_planning_areas(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(planning_areas), 5)
        self.assertEqual(planning_areas[0]["scenario_count"], 3)
        self.assertIsNotNone(planning_areas[0]["latest_updated"])
        self.assertEqual(planning_areas[1]["scenario_count"], 1)
        self.assertIsNotNone(planning_areas[1]["latest_updated"])
        self.assertIsNotNone(planning_areas[0]["created_at"])

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
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        updates_list = [(pa["name"], pa["latest_updated"]) for pa in planning_areas]
        self.assertEqual(
            updates_list,
            [
                ("test plan4", "2010-12-01T05:01:01Z"),
                ("test plan5", "2010-11-01T05:01:01Z"),
                ("test plan3", "2010-10-01T05:01:01Z"),
                ("test plan1", "2010-09-01T05:01:01Z"),
                ("test plan2", "2010-02-01T05:01:01Z"),
            ],
        )

    def test_list_planning_areas_not_logged_in(self):
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_list_planning_areas_empty_user(self):
        self.client.force_authenticate(self.emptyuser)
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)


# EndtoEnd test that lists, creates a planning_area, creates a scenario,
# tests what was stored, and then deletes everything.
# This covers the basic happiest of cases and should not be a substitute
# for the main unit tests.
class EndtoEndPlanningAreaAndScenarioTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.internal_geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.geometry = {"features": [{"geometry": self.internal_geometry}]}
        self.scenario_configuration = {
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

    @mock.patch(
        "planning.views.validate_scenario_treatment_ratio",
        return_value=(True, "all good"),
    )
    def test_end_to_end(self, validation):
        self.client.force_authenticate(self.user)

        # List - returns 0
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

        # insert one
        payload = json.dumps(
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            }
        )
        response = self.client.post(
            reverse("planning:create_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 1)

        # is it there?
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        planning_areas = response.json()
        listed_planning_area = planning_areas[0]
        self.assertEqual(listed_planning_area["scenario_count"], 0)

        # get plan details
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": listed_planning_area["id"]},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_area = response.json()
        self.assertEqual(planning_area["name"], "test plan")
        self.assertEqual(planning_area["region_name"], "Sierra Nevada")
        self.assertEqual(planning_area["id"], listed_planning_area["id"])
        self.assertEqual(planning_area["geometry"], self.internal_geometry)

        # create a scenario
        payload_create_scenario = json.dumps(
            {
                "planning_area": listed_planning_area["id"],
                "configuration": self.scenario_configuration,
                "name": "test scenario",
                "notes": "test notes",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload_create_scenario,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = response.json()
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, listed_planning_area["id"])
        self.assertEqual(
            scenario.configuration.keys(), self.scenario_configuration.keys()
        )
        self.assertEqual(scenario.name, "test scenario")
        self.assertEqual(scenario.notes, "test notes")

        # check that scenario metadata shows up in the plan details.
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": listed_planning_area["id"]},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_area = response.json()
        self.assertEqual(planning_area["name"], "test plan")
        self.assertEqual(planning_area["region_name"], "Sierra Nevada")
        self.assertEqual(planning_area["id"], listed_planning_area["id"])
        self.assertEqual(planning_area["geometry"], self.internal_geometry)
        self.assertEqual(planning_area["scenario_count"], 1)
        self.assertIsNotNone(planning_area["latest_updated"])

        # remove it
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            json.dumps({"id": planning_area["id"]}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        # there should be no more planning areas
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

        # checking for a blank database
        self.assertEqual(PlanningArea.objects.count(), 0)
        self.assertEqual(Scenario.objects.count(), 0)
        self.assertEqual(ScenarioResult.objects.count(), 0)
