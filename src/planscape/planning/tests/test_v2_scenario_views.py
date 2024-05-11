import json
import os
from unittest import mock
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from collaboration.tests.helpers import create_collaborator_record
from collaboration.models import Permissions, Role
from planning.models import Scenario, ScenarioResult, ScenarioResultStatus
from planning.tests.helpers import (
    _create_planning_area,
    _create_scenario,
    _create_test_user_set,
    reset_permissions,
)


# TODO: add more tests when we start parsing configurations.
class CreateScenarioTest(APITransactionTestCase):
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
        self.stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.stored_geometry
        )

        self.planning_area2 = _create_planning_area(
            self.owner_user2, "test plan 2", self.stored_geometry
        )

        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
        )

        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
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

    @mock.patch(
        "planning.views.validate_scenario_treatment_ratio",
        return_value=(True, "all good"),
    )
    def test_create_scenario(self, validation):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
                "notes": "test notes",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        output = response.json()
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, self.configuration)
        self.assertEqual(scenario.name, "test scenario")
        self.assertEqual(scenario.notes, "test notes")
        self.assertEqual(scenario.user, self.owner_user)

    @mock.patch(
        "planning.views.validate_scenario_treatment_ratio",
        return_value=(True, "all good"),
    )
    def test_create_scenario_no_notes(self, validation):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        output = json.loads(response.content)
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, self.configuration)
        self.assertEqual(scenario.name, "test scenario")
        self.assertEqual(scenario.notes, None)
        self.assertEqual(scenario.user, self.owner_user)

    # TODO: remove this test or replace with equivalent?
    # - the path requires a planning area pk
    # def test_create_scenario_missing_planning_area(self):
    #     self.client.force_authenticate(self.owner_user)
    #     payload = json.dumps(
    #         {"configuration": self.configuration, "name": "test scenario"}
    #     )
    #     response = self.client.post(
    #         reverse(
    #             "planning:scenarios-list",
    #             kwargs={"planningarea_pk": None},
    #         ),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 400)
    #     self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_missing_configuration(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"name": "test scenario"})
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_missing_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_duplicate_name(self):
        self.client.force_authenticate(self.owner_user)
        first_payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        first_response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            first_payload,
            content_type="application/json",
        )
        self.assertEqual(first_response.status_code, 201)
        second_payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        second_response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            second_payload,
            content_type="application/json",
        )

        self.assertEqual(second_response.status_code, 400)
        self.assertJSONEqual(
            second_response.content,
            {"global": ["The fields planning_area, name must make a unique set."]},
        )

    def test_create_scenario_not_logged_in(self):
        payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    def test_create_scenario_for_nonexistent_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": 99999},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_create_scenario_collab_user(self):
        self.client.force_authenticate(self.collab_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test collab scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        output = response.json()
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        self.assertEqual(ScenarioResult.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, self.configuration)
        self.assertEqual(scenario.name, "test collab scenario")
        self.assertEqual(scenario.user, self.collab_user)

    def test_create_scenario_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test viewer scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_create_scenario_unprivileged_user(self):
        self.client.force_authenticate(self.unprivileged_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area2.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )

    def test_create_scenario_wrong_planning_area_user(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse(
                "planning:scenarios-list",
                kwargs={"planningarea_pk": self.planning_area2.pk},
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )


class UpdateScenarioTest(APITransactionTestCase):
    def setUp(self):
        if Permissions.objects.count() == 0:
            reset_permissions()

        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]
        self.owner_user2 = self.test_users["owner2"]
        self.collab_user = self.test_users["collaborator"]
        self.viewer_user = self.test_users["viewer"]

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.old_notes = "Truly, you have a dizzying intellect."
        self.old_name = "Man in black"
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(
            self.planning_area, self.old_name, "{}", self.owner_user, self.old_notes
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

        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

        self.new_notes = "Wait till I get going!"
        self.new_name = "Vizzini"

    def test_update_notes_and_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"name": self.new_name, "notes": self.new_notes})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.new_name)
        self.assertEqual(scenario.notes, self.new_notes)
        self.assertEqual(scenario.user, self.owner_user)

    def test_update_notes_only(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"notes": self.new_notes})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, self.new_notes)
        self.assertEqual(scenario.user, self.owner_user)

    def test_update_name_only(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"name": self.new_name})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.new_name)
        self.assertEqual(scenario.notes, self.old_notes)

    def test_update_status_only_by_owner(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"status": "ARCHIVED"})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.status, "ARCHIVED")

    def test_update_status_bad_value(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"status": "UNKNOWN_STATUS"})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"error": "Status is not valid."})
        # Ensure status is unchanged
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.status, "ACTIVE")

    def test_update_status_only_by_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        payload = json.dumps({"status": "ARCHIVED"})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )
        # Ensure status is unchanged
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.status, "ACTIVE")

    def test_update_clear_notes(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"notes": None})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, None)

    def test_update_empty_string_notes(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"notes": ""})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, "")

    def test_update_nothing_to_update(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {},
        )
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.name, self.old_name)
        self.assertEqual(scenario.notes, self.old_notes)
        self.assertEqual(scenario.user, self.owner_user)

    def test_update_not_logged_in(self):
        payload = json.dumps(
            {"name": self.new_name, "notes": self.new_notes},
        )
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    # def test_update_missing_id(self):
    #     self.client.force_authenticate(self.owner_user)
    #     payload = json.dumps({"name": self.new_name, "notes": self.new_notes})
    #     response = self.client.patch(
    #         reverse("planning:scenarios-detail"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 400)
    #     self.assertRegex(str(response.content), r"Scenario ID is required")

    def test_update_collab_user(self):
        self.client.force_authenticate(self.collab_user)
        payload = json.dumps({"name": self.new_name, "notes": self.new_notes})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )

    def test_update_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        payload = json.dumps(
            {
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )

    def test_update_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area2.pk,
                    "pk": self.owner_user2scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"detail": "You do not have permission to perform this action."},
        )

    def test_update_blank_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.scenario.pk, "name": None, "notes": self.new_notes}
        )
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"error": "Name must be defined."})

    def test_update_empty_string_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"name": None, "notes": self.new_notes})
        response = self.client.patch(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "planningarea_pk": self.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"error": "Name must be defined."})


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
