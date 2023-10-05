import json
import os
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.test import TransactionTestCase
from django.urls import reverse


from planning.models import PlanningArea, Scenario, ScenarioResult, ScenarioResultStatus

# Yes, we are pulling in an internal just for testing that a geometry write happened.
from planning.views import _convert_polygon_to_multipolygon

# TODO: Add tests to ensure that users can't have planning areas with the same
# name in the same region, and that users can't have scenarios with the same
# name in the same planning area.


# Create test plans.  These are going straight to the test DB without
# normal parameter checking (e.g. if is there a real geometry).
# Always use a Sierra Nevada region.
def _create_planning_area(
    user: User,
    name: str,
    geometry: GEOSGeometry | None = None,
    notes: str | None = None,
) -> PlanningArea:
    """
    Creates a planning_area with the given user, name, geometry, notes.  All regions
    are in Sierra Nevada.
    """
    planning_area = PlanningArea.objects.create(
        user=user,
        name=name,
        region_name="sierra-nevada",
        geometry=geometry,
        notes=notes,
    )
    planning_area.save()
    return planning_area


#### PLAN(NING AREA) Tests ####


class CreatePlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
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
        self.notes = "Inconcievable!  You keep using that word. I do not think it means what you think it means."

    def test_create_planning_area(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
                "notes": self.notes,
            },
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            },
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Southern California",
                "geometry": self.multipolygon_geometry,
            },
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
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {"region_name": "Sierra Nevada", "geometry": self.geometry},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {"name": "test plan", "region_name": "Sierra Nevada"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry_features(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {"name": "test plan", "region_name": "Sierra Nevada", "geometry": {}},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_empty_features(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": {"features": []},
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_geometry(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": {"features": [{"type": "Point", "coordinates": [1, 2]}]},
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_polygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": {"features": [{"geometry": {"type": "Polygon"}}]},
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_planning_area"),
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
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


class DeletePlanningAreaTest(TransactionTestCase):
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
        self.client.force_login(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            {"id": self.planning_area2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": [self.planning_area2.pk]}).encode()
        )
        self.assertEqual(PlanningArea.objects.count(), 2)

    def test_delete_user_not_logged_in(self):
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            {"id": self.planning_area1.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(PlanningArea.objects.count(), 3)
        self.assertRegex(str(response.content), r"User must be logged in")

    # Deleteing someone else's plan silently performs nothing.
    def test_delete_wrong_user(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("planning:delete_planning_area"),
            {"id": self.planning_area3.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 3)

    # Only the user's own plans are deleted.
    def test_delete_multiple_planning_areas_with_some_owner_mismatches(self):
        self.client.force_login(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [
            self.planning_area1.pk,
            self.planning_area2.pk,
            self.planning_area3.pk,
        ]
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            {"id": planning_area_ids},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_multiple_planning_areas(self):
        self.client.force_login(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            {"id": planning_area_ids},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": planning_area_ids}).encode()
        )
        self.assertEqual(PlanningArea.objects.count(), 1)


class UpdatePlanningAreaTest(TransactionTestCase):
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {
                "id": self.planning_area.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            },
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk, "notes": self.new_notes},
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk, "name": self.new_name},
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk, "notes": None},
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk, "notes": ""},
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
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk},
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
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {
                "id": self.planning_area.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")

    def test_update_missing_id(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"name": self.new_name, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"No PlanningArea matches")

    def test_update_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {
                "id": self.planning_area2.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"No PlanningArea matches")

    def test_update_blank_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk, "name": None, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"name must be defined")

    def test_update_empty_string_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_planning_area"),
            {"id": self.planning_area.pk, "name": "", "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"name must be defined")


class GetPlanningAreaTest(TransactionTestCase):
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
        self.client.force_login(self.user)
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
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": 9999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"No PlanningArea matches")

    def test_get_planning_area_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"No PlanningArea matches")

    def test_get_planning_area_not_logged_in(self):
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")


class ListPlanningAreaTest(TransactionTestCase):
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
        self.scenario1 = _create_scenario(
            self.planning_area1, "test scenario1", "{}", ""
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area3 = _create_planning_area(
            self.user2, "test plan3", stored_geometry
        )

        self.emptyuser = User.objects.create(username="emptyuser")
        self.emptyuser.set_password("12345")
        self.emptyuser.save()

    def test_list_planning_areas(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(planning_areas), 2)
        self.assertEqual(planning_areas[0]["scenario_count"], 0)
        self.assertIsNotNone(planning_areas[0]["latest_updated"])
        self.assertEqual(planning_areas[1]["scenario_count"], 1)
        self.assertIsNotNone(planning_areas[1]["latest_updated"])
        self.assertIsNotNone(planning_areas[0]["created_at"])

    def test_list_planning_areas_not_logged_in(self):
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")

    def test_list_planning_areas_empty_user(self):
        self.client.force_login(self.emptyuser)
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)


# EndtoEnd test that lists, creates a planning_area, creates a scenario,
# tests what was stored, and then deletes everything.
# This covers the basic happiest of cases and should not be a substitute
# for the main unit tests.
class EndtoEndPlanningAreaAndScenarioTest(TransactionTestCase):
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
            "est_cost": 0,
            "max_budget": 0,
            "max_road_distance": 0,
            "max_slope": 0,
            "priorities": ["priority1"],
            "weights": [0],
            "stand_size": "Large",
            "excluded_areas": [],
        }

    def test_end_to_end(self):
        self.client.force_login(self.user)

        # List - returns 0
        response = self.client.get(
            reverse("planning:list_planning_areas"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

        # insert one
        response = self.client.post(
            reverse("planning:create_planning_area"),
            {
                "name": "test plan",
                "region_name": "Sierra Nevada",
                "geometry": self.geometry,
            },
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
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": listed_planning_area["id"],
                "configuration": json.dumps(self.scenario_configuration),
                "name": "test scenario",
                "notes": "test notes",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = json.loads(response.content)
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, listed_planning_area["id"])
        self.assertEqual(
            scenario.configuration, json.dumps(self.scenario_configuration)
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
            {"id": planning_area["id"]},
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


#### SCENARIO Tests ####


# Blindly create a scenario and a scenario result in its default (pending) state.
# Note that this does no deduplication, which our APIs may eventually do.
def _create_scenario(
    planning_area: PlanningArea,
    scenario_name: str,
    configuration: str,
    notes: str | None = None,
) -> Scenario:
    scenario = Scenario.objects.create(
        planning_area=planning_area,
        name=scenario_name,
        configuration=configuration,
        notes=notes,
    )
    scenario.save()

    scenario_result = ScenarioResult.objects.create(scenario=scenario)
    scenario_result.save()

    return scenario


# TODO: add more tests when we start parsing configurations.
class CreateScenarioTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.stored_geometry
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan 2", self.stored_geometry
        )

        self.configuration = {
            "est_cost": 0,
            "max_budget": 0,
            "max_road_distance": 0,
            "max_slope": 0,
            "priorities": ["priority1"],
            "weights": [0],
            "stand_size": "Large",
            "excluded_areas": [],
        }

    def test_create_scenario(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": self.planning_area.pk,
                "configuration": json.dumps(self.configuration),
                "name": "test scenario",
                "notes": "test notes",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = json.loads(response.content)
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, json.dumps(self.configuration))
        self.assertEqual(scenario.name, "test scenario")
        self.assertEqual(scenario.notes, "test notes")

    def test_create_scenario_no_notes(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": self.planning_area.pk,
                "configuration": json.dumps(self.configuration),
                "name": "test scenario",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = json.loads(response.content)
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, json.dumps(self.configuration))
        self.assertEqual(scenario.name, "test scenario")
        self.assertEqual(scenario.notes, None)

    def test_create_scenario_missing_planning_area(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {"configuration": json.dumps(self.configuration), "name": "test scenario"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_missing_configuration(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {"planning_area": self.planning_area.pk, "name": "test scenario"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_missing_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": self.planning_area.pk,
                "configuration": json.dumps(self.configuration),
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_not_logged_in(self):
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": self.planning_area.pk,
                "configuration": json.dumps(self.configuration),
                "name": "test scenario",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")

    def test_create_scenario_for_nonexistent_planning_area(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": 999999,
                "configuration": json.dumps(self.configuration),
                "name": "test scenario",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")

    def test_create_scenario_wrong_planning_area_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            {
                "planning_area": self.planning_area2.pk,
                "configuration": json.dumps(self.configuration),
                "name": "test scenario",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"No PlanningArea matches")


class UpdateScenarioTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.old_notes = "Truly, you have a dizzying intellect."
        self.old_name = "Man in black"
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(
            self.planning_area, self.old_name, "{}", self.old_notes
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}"
        )

        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

        self.new_notes = "Wait till I get going!"
        self.new_name = "Vizzini"

    def test_update_notes_and_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "name": self.new_name, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.scenario.pk}).encode()
        )
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.new_name)
        self.assertEqual(scenario.notes, self.new_notes)

    def test_update_notes_only(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.scenario.pk}).encode()
        )
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, self.new_notes)

    def test_update_name_only(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "name": self.new_name},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.scenario.pk}).encode()
        )
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.new_name)
        self.assertEqual(scenario.notes, self.old_notes)

    def test_update_clear_notes(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "notes": None},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.scenario.pk}).encode()
        )
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, None)

    def test_update_empty_string_notes(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "notes": ""},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.scenario.pk}).encode()
        )
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, "")

    def test_update_nothing_to_update(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content, json.dumps({"id": self.scenario.pk}).encode()
        )
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, self.old_notes)

    def test_update_not_logged_in(self):
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "name": self.new_name, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")

    def test_update_missing_id(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"name": self.new_name, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Scenario ID is required")

    def test_update_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {
                "id": self.user2scenario.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")

    def test_update_blank_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "name": None, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"name must be defined")

    def test_update_empty_string_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario"),
            {"id": self.scenario.pk, "name": None, "notes": self.new_notes},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"name must be defined")


class UpdateScenarioResultTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(self.planning_area, "test scenario", "{}")
        self.scenario2 = _create_scenario(self.planning_area, "test scenario2", "{}")
        self.scenario3 = _create_scenario(self.planning_area, "test scenario3", "{}")
        self.empty_planning_area = _create_planning_area(
            self.user, "empty test plan", self.storable_geometry
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}"
        )

        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_update_scenario_result(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = json.loads(response.content)
        self.assertEquals(output["id"], self.scenario.pk)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, json.dumps({"result1": "test result"}))
        self.assertEqual(
            scenario_result.run_details, json.dumps({"details": "super duper details"})
        )

    def test_update_scenario_result_twice(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps(
                    {
                        "result1": "I do not mean to pry, but you do not by any chance happen to have six fingers on your right hand?"
                    }
                ),
                "run_details": json.dumps(
                    {"details": "Do you always begin conversations this way?"}
                ),
                "status": ScenarioResultStatus.SUCCESS,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.SUCCESS)
        self.assertEqual(
            scenario_result.result,
            json.dumps(
                {
                    "result1": "I do not mean to pry, but you do not by any chance happen to have six fingers on your right hand?"
                }
            ),
        )
        self.assertEqual(
            scenario_result.run_details,
            json.dumps({"details": "Do you always begin conversations this way?"}),
        )

    def test_update_scenario_result_status_only(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {"scenario_id": self.scenario.pk, "status": ScenarioResultStatus.RUNNING},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, None)
        self.assertEqual(scenario_result.run_details, None)

    def test_update_scenario_result_result_only(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"comment": "test comment"}),
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.PENDING)
        self.assertEqual(
            scenario_result.result, json.dumps({"comment": "test comment"})
        )
        self.assertEqual(scenario_result.run_details, None)

    def test_update_scenario_result_run_details_only(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.scenario.pk,
                "run_details": json.dumps({"comment": "test comment"}),
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.PENDING)
        self.assertEqual(scenario_result.result, None)
        self.assertEqual(
            scenario_result.run_details, json.dumps({"comment": "test comment"})
        )

    def test_update_scenario_result_bad_status_pending_to_pending(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {"scenario_id": self.scenario.pk, "status": ScenarioResultStatus.PENDING},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Invalid new state")

    def test_update_scenario_result_bad_status_pending_to_success(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {"scenario_id": self.scenario.pk, "status": ScenarioResultStatus.SUCCESS},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Invalid new state")

    # This works since EPs don't have a user context.
    # TODO: Update when we have EPs sending a credential over.
    def test_update_scenario_result_not_logged_in(self):
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, json.dumps({"result1": "test result"}))
        self.assertEqual(
            scenario_result.run_details, json.dumps({"details": "super duper details"})
        )

    # This works since EPs don't have a user context.
    # TODO: Update when we have EPs sending a credential over.
    def test_update_scenario_result_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": self.user2scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.user2scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, json.dumps({"result1": "test result"}))
        self.assertEqual(
            scenario_result.run_details, json.dumps({"details": "super duper details"})
        )

    def test_update_scenario_result_nonexistent_scenario(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            {
                "scenario_id": 99999,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")


class ListScenariosForPlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(self.planning_area, "test scenario", "{}")
        self.scenario2 = _create_scenario(self.planning_area, "test scenario2", "{}")
        self.scenario3 = _create_scenario(self.planning_area, "test scenario3", "{}")
        self.empty_planning_area = _create_planning_area(
            self.user, "empty test plan", self.storable_geometry
        )

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}"
        )

        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_list_scenario(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 3)
        self.assertIsNotNone(scenarios[0]["created_at"])
        self.assertIsNotNone(scenarios[0]["updated_at"])

    def test_list_scenario_not_logged_in(self):
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")

    def test_list_scenario_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.planning_area2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 0)

    def test_list_scenario_empty_planning_area(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.empty_planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 0)

    def test_list_scenario_nonexistent_planning_area(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 0)


class GetScenarioTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(self.planning_area, "test scenario", "{}")

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.scenario2 = _create_scenario(self.planning_area2, "test scenario2", "{}")

        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    def test_get_scenario(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        response_json = json.loads(response.content)
        self.assertIsNotNone(response_json["created_at"])
        self.assertIsNotNone(response_json["updated_at"])

    def test_get_scenario_not_logged_in(self):
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"User must be logged in")

    def test_get_scenario_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")

    def test_get_scenario_nonexistent_scenario(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")

    def test_get_scenario_with_results(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk, "show_results": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["name"], "test scenario")
        self.assertEqual(
            result["scenario_result"]["status"], ScenarioResultStatus.PENDING
        )


class GetScenarioDownloadTest(TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.set_verbose = True
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(self.planning_area, "test scenario", "{}")

        # set scenario result status to success
        self.scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.scenario_result.status = ScenarioResultStatus.SUCCESS
        self.scenario_result.save()

        # generate fake data in a directory that corresponds to this scenario name
        self.mock_project_path = str(settings.OUTPUT_DIR) + "/" + "test scenario"

        # this will also make the output directory that we currently don't commit
        os.makedirs(self.mock_project_path, exist_ok=True)
        self.mock_project_file = os.path.join(self.mock_project_path, "fake_data.txt")
        with open(self.mock_project_file, "w") as handle:
            print("Just test data", file=handle)

        # create a second scenario with a different user

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.scenario2 = _create_scenario(self.planning_area2, "test scenario2", "{}")
        # set scenario result status to success
        self.scenario2_result = ScenarioResult.objects.get(
            scenario__id=self.scenario2.pk
        )
        self.scenario2_result.status = ScenarioResultStatus.SUCCESS
        self.scenario2_result.save()

        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    def tearDown(self):
        os.remove(self.mock_project_file)
        os.rmdir(self.mock_project_path)
        return super().tearDown()

    def test_get_scenario_with_zip(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_download_by_id"), {"id": self.scenario.pk}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/zip")
        self.assertIsInstance(response.content, bytes)

    def test_get_scenario_not_logged_in(self):
        response = self.client.get(
            reverse("planning:get_scenario_download_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertRegex(str(response.content), r"Unauthorized. User is not logged in.")

    def test_get_scenario_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_download_by_id"),
            {"id": self.scenario2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")

    def test_get_scenario_without_project_data(self):
        self.client.force_login(self.user2)
        self.scenario2_result.status = ScenarioResultStatus.SUCCESS
        self.scenario2_result.save()

        self.client.force_login(self.user2)
        response = self.client.get(
            reverse("planning:get_scenario_download_by_id"),
            {"id": self.scenario2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Scenario files cannot be read")

    def test_get_scenario_without_success_status(self):
        self.client.force_login(self.user)
        self.scenario_result.status = ScenarioResultStatus.FAILURE
        self.scenario_result.save()

        response = self.client.get(
            reverse("planning:get_scenario_download_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(
            str(response.content),
            r"Scenario was not successful, data cannot be downloaded.",
        )

    def test_get_scenario_nonexistent_scenario(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("planning:get_scenario_download_by_id"),
            {"id": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"does not exist")


class DeleteScenarioTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(self.planning_area, "test scenario", "{}")
        self.scenario2 = _create_scenario(self.planning_area, "test scenario2", "{}")
        self.scenario3 = _create_scenario(self.planning_area, "test scenario3", "{}")

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}"
        )

        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:delete_scenario"),
            {"scenario_id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 3)
        self.assertEqual(ScenarioResult.objects.count(), 3)

    def test_delete_scenario_multiple_owned(self):
        self.client.force_login(self.user)
        scenario_ids = [self.scenario.pk, self.scenario2.pk]
        response = self.client.post(
            reverse("planning:delete_scenario"),
            {"scenario_id": scenario_ids},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    # Silently does nothing for the non-owned scenario.
    def test_delete_scenario_multiple_partially_owned(self):
        self.client.force_login(self.user)
        scenario_ids = [self.scenario.pk, self.scenario2.pk, self.user2scenario.pk]
        response = self.client.post(
            reverse("planning:delete_scenario"),
            {"scenario_id": scenario_ids},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    def test_delete_scenario_not_logged_in(self):
        response = self.client.post(
            reverse("planning:delete_scenario"),
            {"scenario_id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)
        self.assertRegex(str(response.content), r"User must be logged in")

    # Silently does nothing.
    def test_delete_scenario_wrong_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:delete_scenario"),
            {"scenario_id": self.user2scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    # Silently does nothing.
    def test_delete_scenario_nonexistent_id(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:delete_scenario"),
            {"scenario_id": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario_missing_id(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:delete_scenario"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)
        self.assertRegex(str(response.content), r"Must specify scenario id")
