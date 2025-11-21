import json

from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from impacts.permissions import (
    COLLABORATOR_PERMISSIONS,
    OWNER_PERMISSIONS,
    VIEWER_PERMISSIONS,
)
from planscape.tests.factories import UserFactory
from rest_framework.test import APITestCase

from planning.models import PlanningAreaNote
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planning.tests.test_geometry import read_shapefile, to_geometry


class ValidatePlanningAreaTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.valid_pa = {
            "type": "Polygon",
            "coordinates": [
                [
                    [0, 0],
                    [0, 1],
                    [1, 1],
                    [1, 0],
                    [0, 0],
                ],
            ],
        }
        self.invalid_pa = {
            "type": "Polygon",
            "coordinates": [
                [
                    [-46.01299715793388, -18.545559916237735],
                    [-45.43418235211229, -18.296994989031617],
                    [-46.02213633907763, -18.99263980743585],
                    [-45.34888332809618, -18.534006734887157],
                    [-46.01299715793388, -18.545559916237735],
                ]
            ],
        }
        with read_shapefile("planning/tests/test_data/self-intersection.shp") as col:
            self.self_intersection = json.loads(to_geometry(col[0].geometry).json)

    def test_validate_planning_area_returns_area_acres(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.valid_pa}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("area_acres", response.json())

    def test_validate_planning_area_invalid_pa_fixes_pa(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.invalid_pa}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_validate_planning_area_fails(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.self_intersection}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 400)


class ListPlanningAreaTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create(username="testuser")
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area1 = PlanningAreaFactory.create(
            user=self.user,
            name="test plan1",
            geometry=stored_geometry,
        )
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.user,
            name="test plan2",
            geometry=stored_geometry,
        )
        self.planning_area3 = PlanningAreaFactory.create(
            user=self.user,
            name="test plan3",
            geometry=stored_geometry,
        )
        self.planning_area4 = PlanningAreaFactory.create(
            user=self.user,
            name="test plan4",
            geometry=stored_geometry,
        )
        self.planning_area5 = PlanningAreaFactory.create(
            user=self.user,
            name="test plan5",
            geometry=stored_geometry,
        )
        self.scenario1_1 = ScenarioFactory.create(
            planning_area=self.planning_area1,
            name="test pa1 scenario1 ",
            configuration={},
            user=self.user,
            notes="",
        )
        self.scenario1_2 = ScenarioFactory.create(
            planning_area=self.planning_area1,
            name="test pa1 scenario2",
            configuration={},
            user=self.user,
            notes="",
        )
        self.scenario1_3 = ScenarioFactory.create(
            planning_area=self.planning_area1,
            name="test pa1 scenario3",
            configuration={},
            user=self.user,
            notes="",
        )
        self.planning_area1.scenario_count = 3
        self.planning_area1.save(update_fields=["updated_at", "scenario_count"])
        self.scenario3_1 = ScenarioFactory.create(
            planning_area=self.planning_area3,
            name="test pa3 scenario1",
            configuration={},
            user=self.user,
            notes="",
        )
        self.planning_area3.scenario_count = 1
        self.planning_area3.save(update_fields=["updated_at", "scenario_count"])
        self.scenario4_1 = ScenarioFactory.create(
            planning_area=self.planning_area4,
            name="test pa4 scenario1 ",
            configuration={},
            user=self.user,
            notes="",
        )
        self.scenario4_2 = ScenarioFactory.create(
            planning_area=self.planning_area4,
            name="test pa4 scenario2",
            configuration={},
            user=self.user,
            notes="",
        )
        self.scenario4_3 = ScenarioFactory.create(
            planning_area=self.planning_area4,
            name="test pa4 scenario3",
            configuration={},
            user=self.user,
            notes="",
        )
        self.planning_area4.scenario_count = 3
        self.planning_area4.save(update_fields=["updated_at", "scenario_count"])
        self.user2 = UserFactory.create(username="otherowner")
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area6 = PlanningAreaFactory.create(
            user=self.user2,
            name="test plan3",
            geometry=stored_geometry,
        )

        self.emptyuser = UserFactory.create(username="emptyuser")

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
            collaborators=[self.collab_user],
            viewers=[self.viewer_user],
        )
        self.planning_area_notshared = PlanningAreaFactory.create(
            user=self.creator_user,
            name="Not Shared Area",
            geometry=stored_geometry,
        )

    def test_planningareas_list_for_creator(self):
        self.client.force_authenticate(self.creator_user)
        response = self.client.get(
            reverse("planning:list_planning_areas"),
            {},
            content_type="application/json",
        )
        planning_areas = json.loads(response.content)
        expected_perms = OWNER_PERMISSIONS
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
            COLLABORATOR_PERMISSIONS,
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
        self.assertCountEqual(the_area["permissions"], VIEWER_PERMISSIONS)


class CreatePlanningAreaNote(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory()
        self.collab_user = UserFactory()
        self.viewer_user = UserFactory()

        self.planningarea = PlanningAreaFactory.create(
            user=self.owner_user,
            region_name="foo",
            collaborators=[self.collab_user],
            viewers=[self.viewer_user],
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


class GetPlanningAreaNotes(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory()
        self.collab_user = UserFactory()
        self.viewer_user = UserFactory()
        self.unassociated_user = UserFactory()  # no perms for Planning Area

        self.planningarea = PlanningAreaFactory.create(
            user=self.owner_user,
            region_name="foo",
            collaborators=[self.collab_user],
            viewers=[self.viewer_user],
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
        # these should be ordered by created_at, latest on top
        # so we ought to be able to test by index id
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

    def test_get_note_delete_permissions(self):
        self.client.force_authenticate(self.collab_user)
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
        self.assertEqual(planning_area_notes[0]["can_delete"], False)
        # note owned by collab_user, so can delete
        self.assertEqual(planning_area_notes[1]["can_delete"], True)
        self.assertEqual(planning_area_notes[2]["can_delete"], False)

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


class DeletePlanningAreaNotes(APITestCase):
    def setUp(self):
        self.owner_user = UserFactory()
        self.collab_user = UserFactory()
        self.viewer_user = UserFactory()
        self.unassociated_user = UserFactory()  # no perms for Planning Area

        self.planningarea = PlanningAreaFactory.create(
            user=self.owner_user,
            region_name="foo",
            collaborators=[self.collab_user],
            viewers=[self.viewer_user],
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
