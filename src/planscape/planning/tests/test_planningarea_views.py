import json
from unittest import mock
from django.db import connection
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APITransactionTestCase
from collaboration.models import Role, Permissions
from collaboration.tests.helpers import create_collaborator_record
from planning.geometry import coerce_geojson
from planning.models import PlanningArea, Scenario, ScenarioResult, PlanningAreaNote
from planning.tests.helpers import (
    _create_planning_area,
    _create_scenario,
    _create_test_user_set,
    reset_permissions,
)


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
            reverse("planning:create_planning_area"),
            data=payload,
            content_type="application/json",
        )
        data = response.json()

        self.assertEqual(response.status_code, 200)
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
            reverse("planning:create_planning_area"),
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
            reverse("planning:create_planning_area"),
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
        payload = json.dumps({"id": self.planning_area2.pk})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": [self.planning_area2.pk]})
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
        self.client.force_authenticate(self.owner_user)
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
        self.client.force_authenticate(self.owner_user)
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
        self.client.force_authenticate(self.owner_user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
        payload = json.dumps({"id": planning_area_ids})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": planning_area_ids})
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_delete_multiple_planning_areas_as_collab(self):
        self.client.force_authenticate(self.collab_user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
        payload = json.dumps({"id": planning_area_ids})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": planning_area_ids})
        self.assertEqual(PlanningArea.objects.count(), 3)

    def test_delete_multiple_planning_areas_as_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        planning_area_ids = [self.planning_area1.pk, self.planning_area2.pk]
        payload = json.dumps({"id": planning_area_ids})
        response = self.client.post(
            reverse("planning:delete_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": planning_area_ids})
        # Viewer has no permission to delete, so all records should still exist
        self.assertEqual(PlanningArea.objects.count(), 3)


class UpdatePlanningAreaTest(APITransactionTestCase):
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

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.old_name = "Westley"
        self.old_notes = "I know something you don't know."
        self.planning_area = _create_planning_area(
            self.owner_user, self.old_name, storable_geometry, self.old_notes
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
        )

        self.planning_area2 = _create_planning_area(
            self.owner_user2, "Owned By Owner 2 plan", storable_geometry
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area2, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area2, Role.VIEWER
        )
        self.new_name = "Inigo"
        self.new_notes = "I am not left handed."

    def test_update_notes_and_name(self):
        self.client.force_authenticate(self.owner_user)
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
        self.assertJSONEqual(response.content, {"id": self.planning_area.pk})
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.new_name)
        self.assertEqual(planning_area.notes, self.new_notes)

    def test_update_notes_only(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"id": self.planning_area.pk, "notes": self.new_notes})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.planning_area.pk})
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, self.new_notes)

    def test_update_name_only(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"id": self.planning_area.pk, "name": self.new_name})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.planning_area.pk})
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.new_name)
        self.assertEqual(planning_area.notes, self.old_notes)

    def test_update_clear_notes(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"id": self.planning_area.pk, "notes": None})
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.planning_area.pk})
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, None)

    def test_update_empty_string_notes(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.planning_area.pk, "notes": ""},
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.planning_area.pk})
        planning_area = PlanningArea.objects.get(pk=self.planning_area.pk)
        self.assertEqual(planning_area.name, self.old_name)
        self.assertEqual(planning_area.notes, "")

    def test_update_nothing_to_update(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.planning_area.pk},
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.planning_area.pk})
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
        self.client.force_authenticate(self.owner_user)
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
        self.client.force_authenticate(self.owner_user2)
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
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"message": "User does not have permission to update this planning area"},
        )

    def test_update_collaborator_user(self):
        self.client.force_authenticate(self.collab_user)
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
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"message": "User does not have permission to update this planning area"},
        )

    def test_update_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
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
        self.assertEqual(response.status_code, 403)

        self.assertJSONEqual(
            response.content,
            {"message": "User does not have permission to update this planning area"},
        )

    def test_update_blank_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.planning_area.pk, "name": None, "notes": self.new_notes}
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"message": "Name must be defined"})

    def test_update_empty_string_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.planning_area.pk, "name": "", "notes": self.new_notes}
        )
        response = self.client.patch(
            reverse("planning:update_planning_area"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"message": "Name must be defined"})


class GetPlanningAreaTest(APITransactionTestCase):
    def setUp(self):
        if not Permissions.objects.exists():
            reset_permissions()

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

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.owner_user, "Owned By Owner 1 plan", storable_geometry
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
        )

        self.planning_area2 = _create_planning_area(
            self.owner_user2, "Owned By Owner 2 plan", storable_geometry
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area2, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area2, Role.VIEWER
        )

    def test_get_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        returned_planning_area = response.json()
        self.assertEqual(returned_planning_area["name"], "Owned By Owner 1 plan")
        self.assertEqual(returned_planning_area["creator"], "Oliver Owner")
        self.assertEqual(returned_planning_area["region_name"], "Sierra Nevada")
        self.assertIsNotNone(returned_planning_area["created_at"])

    def test_get_nonexistent_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": 9999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertJSONEqual(
            response.content, {"message": "Planning area not found with this ID"}
        )

    def test_get_planning_area_as_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        returned_planning_area = response.json()
        self.assertEqual(returned_planning_area["name"], "Owned By Owner 1 plan")
        self.assertEqual(returned_planning_area["region_name"], "Sierra Nevada")
        self.assertEqual(returned_planning_area["creator"], "Oliver Owner")
        self.assertEqual(returned_planning_area["role"], "Collaborator")
        self.assertCountEqual(
            returned_planning_area["permissions"],
            ["view_planningarea", "view_scenario", "add_scenario"],
        )
        self.assertIsNotNone(returned_planning_area["created_at"])

    def test_get_planning_area_as_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        returned_planning_area = response.json()
        self.assertEqual(returned_planning_area["name"], "Owned By Owner 1 plan")
        self.assertEqual(returned_planning_area["region_name"], "Sierra Nevada")
        self.assertEqual(returned_planning_area["creator"], "Oliver Owner")
        self.assertEqual(returned_planning_area["role"], "Viewer")
        self.assertCountEqual(
            returned_planning_area["permissions"],
            ["view_planningarea", "view_scenario"],
        )
        self.assertIsNotNone(returned_planning_area["created_at"])

    def test_get_planning_area_as_unlinked_owner(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content, {"message": "User has no access to this planning area."}
        )

    def test_get_planning_area_as_unprivileged_user(self):
        self.client.force_authenticate(self.unprivileged_user)
        response = self.client.get(
            reverse("planning:get_planning_area_by_id"),
            {"id": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content, {"message": "User has no access to this planning area."}
        )

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

        self.user2 = User.objects.create(username="otherowner")
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
            reverse("planning:list_planning_areas"),
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
        self.assertEqual(len(planning_areas), 3)
        self.assertEqual(planning_areas[0]["role"], "Creator")
        self.assertEqual(planning_areas[1]["role"], "Creator")
        self.assertEqual(planning_areas[2]["role"], "Creator")
        self.assertCountEqual(planning_areas[0]["permissions"], expected_perms)
        self.assertCountEqual(planning_areas[1]["permissions"], expected_perms)
        self.assertCountEqual(planning_areas[2]["permissions"], expected_perms)

    def test_planningareas_list_for_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse("planning:list_planning_areas"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(len(planning_areas), 1)
        the_area = planning_areas[0]
        self.assertEqual(the_area["role"], "Collaborator")
        self.assertCountEqual(
            the_area["permissions"],
            ["view_planningarea", "view_scenario", "add_scenario"],
        )

    def test_planningareas_list_for_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse("planning:list_planning_areas"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        self.assertEqual(len(planning_areas), 1)
        the_area = planning_areas[0]
        self.assertEqual(the_area["role"], "Viewer")
        self.assertCountEqual(
            the_area["permissions"], ["view_planningarea", "view_scenario"]
        )


class CreatePlanningAreaNote(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()
        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]
        self.collab_user = self.test_users["collaborator"]
        self.viewer_user = self.test_users["viewer"]

        self.planningarea = PlanningArea.objects.create(
            user=self.owner_user, region_name="foo"
        )
        create_collaborator_record(
            self.owner_user,
            self.collab_user,
            self.planningarea,
            Role.COLLABORATOR,
        )
        create_collaborator_record(
            self.owner_user,
            self.viewer_user,
            self.planningarea,
            Role.VIEWER,
        )

    def test_create_note_for_planningarea(self):
        self.client.force_authenticate(self.owner_user)
        payload_create_note = json.dumps(
            {
                "content": "Here is a note about a planning area.",
            }
        )
        response = self.client.post(
            reverse(
                "planning:create_planningareanote",
                kwargs={"planningarea_pk": self.planningarea.pk},
            ),
            payload_create_note,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        planning_area_note = response.json()
        self.assertEqual(
            planning_area_note["content"], "Here is a note about a planning area."
        )

    def test_create_note_as_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        payload_create_note = json.dumps(
            {
                "content": "Here is a note from a viewer.",
            }
        )
        response = self.client.post(
            reverse(
                "planning:create_planningareanote",
                kwargs={"planningarea_pk": self.planningarea.pk},
            ),
            payload_create_note,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        planning_area_note = response.json()
        self.assertEqual(planning_area_note["content"], "Here is a note from a viewer.")

    def test_create_note_unauthenticated(self):
        payload_create_note = json.dumps(
            {
                "content": "Lets create a note without authentication",
            }
        )
        response = self.client.post(
            reverse(
                "planning:create_planningareanote",
                kwargs={"planningarea_pk": self.planningarea.pk},
            ),
            payload_create_note,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)


class GetPlanningAreaNotes(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()

        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]
        self.collab_user = self.test_users["collaborator"]
        self.viewer_user = self.test_users["viewer"]
        self.unassociated_user = self.test_users["owner2"]  # no perms for Planning Area

        self.planningarea = PlanningArea.objects.create(
            user=self.owner_user, region_name="foo"
        )
        self.note = PlanningAreaNote.objects.create(
            user=self.owner_user,
            planning_area=self.planningarea,
            content="Just a comment about this planning area.",
        )
        self.note2 = PlanningAreaNote.objects.create(
            user=self.collab_user,
            planning_area=self.planningarea,
            content="Collaborator comment -- so much to say.",
        )
        self.note3 = PlanningAreaNote.objects.create(
            user=self.viewer_user,
            planning_area=self.planningarea,
            content="Viewer comment, just commenting",
        )
        create_collaborator_record(
            self.owner_user,
            self.collab_user,
            self.planningarea,
            Role.COLLABORATOR,
        )
        create_collaborator_record(
            self.owner_user,
            self.viewer_user,
            self.planningarea,
            Role.VIEWER,
        )

    def test_get_all_notes_for_a_planningarea(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:get_planningareanote",
                kwargs={"planningarea_pk": self.planningarea.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_area_notes = response.json()
        self.assertEqual(len(planning_area_notes), 3)
        # these should be ordered by created_at, latest on top, so we ought to be able to test by index id
        self.assertEqual(
            planning_area_notes[0]["content"],
            "Viewer comment, just commenting",
        )
        self.assertEqual(
            planning_area_notes[2]["content"],
            "Just a comment about this planning area.",
        )
        self.assertEqual(
            planning_area_notes[0]["user_id"],
            self.viewer_user.pk,
        )
        self.assertEqual(
            planning_area_notes[2]["user_id"],
            self.owner_user.pk,
        )

    def test_get_notes_unauthenticated(self):
        response = self.client.post(
            reverse(
                "planning:get_planningareanote",
                kwargs={"planningarea_pk": self.planningarea.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_get_specific_note_for_a_planningarea(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:get_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.note2.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        planning_area_note = response.json()
        self.assertEqual(
            planning_area_note["content"], "Collaborator comment -- so much to say."
        )

    def test_get_specific_note_for_noncollaborator(self):
        self.client.force_authenticate(self.unassociated_user)
        response = self.client.get(
            reverse(
                "planning:get_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.note2.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_get_specific_note_unauthenticated(self):
        response = self.client.get(
            reverse(
                "planning:get_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.note2.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)


class DeletePlanningAreaNotes(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()

        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]
        self.collab_user = self.test_users["collaborator"]
        self.viewer_user = self.test_users["viewer"]
        self.unassociated_user = self.test_users["owner2"]  # no perms for Planning Area

        self.planningarea = PlanningArea.objects.create(
            user=self.owner_user, region_name="foo"
        )
        self.owner_note = PlanningAreaNote.objects.create(
            user=self.owner_user,
            planning_area=self.planningarea,
            content="Just a comment about this planning area.",
        )
        self.collab_note = PlanningAreaNote.objects.create(
            user=self.collab_user,
            planning_area=self.planningarea,
            content="Collaborator comment -- so much to say.",
        )
        self.viewer_note = PlanningAreaNote.objects.create(
            user=self.viewer_user,
            planning_area=self.planningarea,
            content="Viewer comment, just commenting",
        )
        create_collaborator_record(
            self.owner_user,
            self.collab_user,
            self.planningarea,
            Role.COLLABORATOR,
        )
        create_collaborator_record(
            self.owner_user,
            self.viewer_user,
            self.planningarea,
            Role.VIEWER,
        )

    def test_delete_note_as_owner(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:delete_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.owner_note.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_note_as_nonauthor_planningarea_owner(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse(
                "planning:delete_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.collab_note.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_note_as_nonauthor_nonowner(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse(
                "planning:delete_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.viewer_note.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_note_as_author_nonowner(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse(
                "planning:delete_planningareanote",
                kwargs={
                    "planningarea_pk": self.planningarea.pk,
                    "planningareanote_pk": self.viewer_note.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)


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
            "coordinates": [
                [
                    [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]],
                ],
            ],
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
