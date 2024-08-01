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
from planning.tests.factories import PlanningAreaFactory
from planning.tests.helpers import (
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
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan", geometry=self.stored_geometry
        )

        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan 2", geometry=self.stored_geometry
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
    @mock.patch("planning.services.async_forsys_run.delay", return_value=None)
    def test_create_scenario(self, validation, _forsys_run):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test scenario",
                "notes": "test notes",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = response.json()
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
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
    @mock.patch("planning.services.async_forsys_run.delay", return_value=None)
    def test_create_scenario_no_notes(self, validation, _forsys_run):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = json.loads(response.content)
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, self.configuration)
        self.assertEqual(scenario.name, "test scenario")
        self.assertEqual(scenario.notes, None)
        self.assertEqual(scenario.user, self.owner_user)

    def test_create_scenario_missing_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"configuration": self.configuration, "name": "test scenario"}
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_missing_configuration(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"planning_area": self.planning_area.pk, "name": "test scenario"}
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    def test_create_scenario_missing_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"This field is required")

    @mock.patch("planning.services.async_forsys_run.delay", return_value=None)
    def test_create_scenario_duplicate_name(self, _forsys_run):
        self.client.force_authenticate(self.owner_user)
        first_payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        first_response = self.client.post(
            reverse("planning:create_scenario"),
            first_payload,
            content_type="application/json",
        )
        self.assertEqual(first_response.status_code, 200)
        second_payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        second_response = self.client.post(
            reverse("planning:create_scenario"),
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
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_create_scenario_for_nonexistent_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "planning_area": 999999,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    @mock.patch("planning.services.async_forsys_run.delay", return_value=None)
    def test_create_scenario_collab_user(self, _forsys_run):
        self.client.force_authenticate(self.collab_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test collab scenario",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = response.json()
        scenario_id = output["id"]
        self.assertEqual(Scenario.objects.count(), 1)
        scenario = Scenario.objects.get(pk=scenario_id)
        self.assertEqual(scenario.planning_area.pk, self.planning_area.pk)
        self.assertEqual(scenario.configuration, self.configuration)
        self.assertEqual(scenario.name, "test collab scenario")
        self.assertEqual(scenario.user, self.collab_user)

    def test_create_scenario_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area.pk,
                "configuration": self.configuration,
                "name": "test viewer scenario",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_create_scenario_unprivileged_user(self):
        self.client.force_authenticate(self.unprivileged_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area2.pk,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {
                "error": "User does not have permission to create scenarios from this Planning Area"
            },
        )

    def test_create_scenario_wrong_planning_area_user(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "planning_area": self.planning_area2.pk,
                "configuration": self.configuration,
                "name": "test scenario",
            }
        )
        response = self.client.post(
            reverse("planning:create_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {
                "error": "User does not have permission to create scenarios from this Planning Area"
            },
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
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan"
        )
        self.scenario = _create_scenario(
            self.planning_area, self.old_name, "{}", self.owner_user, self.old_notes
        )

        self.owner_user2 = User.objects.create(username="testuser2")
        self.owner_user2.set_password("12345")
        self.owner_user2.save()
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan2"
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
        payload = json.dumps(
            {"id": self.scenario.pk, "name": self.new_name, "notes": self.new_notes}
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
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
        payload = json.dumps({"id": self.scenario.pk, "notes": self.new_notes})
        response = self.client.post(
            reverse("planning:update_scenario"),
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
        payload = json.dumps({"id": self.scenario.pk, "name": self.new_name})
        response = self.client.post(
            reverse("planning:update_scenario"),
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
        payload = json.dumps({"id": self.scenario.pk, "status": "ARCHIVED"})
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"id": self.scenario.pk})
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.status, "ARCHIVED")

    def test_update_status_bad_value(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"id": self.scenario.pk, "status": "UNKNOWN_STATUS"})
        response = self.client.post(
            reverse("planning:update_scenario"),
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
        payload = json.dumps({"id": self.scenario.pk, "status": "ARCHIVED"})
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"error": "User does not have permission to update this scenario."},
        )
        # Ensure status is unchanged
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.status, "ACTIVE")

    def test_update_clear_notes(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"id": self.scenario.pk, "notes": None})
        response = self.client.post(
            reverse("planning:update_scenario"),
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
        payload = json.dumps({"id": self.scenario.pk, "notes": ""})
        response = self.client.post(
            reverse("planning:update_scenario"),
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
            {"id": self.scenario.pk},
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
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
            {"id": self.scenario.pk, "name": self.new_name, "notes": self.new_notes},
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_update_missing_id(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"name": self.new_name, "notes": self.new_notes})
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Scenario ID is required")

    def test_update_collab_user(self):
        self.client.force_authenticate(self.collab_user)
        payload = json.dumps(
            {"id": self.scenario.pk, "name": self.new_name, "notes": self.new_notes}
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"error": "User does not have permission to update this scenario."},
        )

    def test_update_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        payload = json.dumps(
            {
                "id": self.scenario.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"error": "User does not have permission to update this scenario."},
        )

    def test_update_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "id": self.owner_user2scenario.pk,
                "name": self.new_name,
                "notes": self.new_notes,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"error": "User does not have permission to update this scenario."},
        )

    def test_update_blank_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.scenario.pk, "name": None, "notes": self.new_notes}
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"error": "Name must be defined."})

    def test_update_empty_string_name(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"id": self.scenario.pk, "name": None, "notes": self.new_notes}
        )
        response = self.client.post(
            reverse("planning:update_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(response.content, {"error": "Name must be defined."})


class UpdateScenarioResultTest(APITransactionTestCase):
    def setUp(self):
        self.test_users = _create_test_user_set()
        self.owner_user = self.test_users["owner"]
        self.owner_user2 = self.test_users["owner2"]

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan"
        )
        self.scenario = _create_scenario(
            self.planning_area, "test scenario", "{}", user=self.owner_user
        )
        self.scenario2 = _create_scenario(
            self.planning_area, "test scenario2", "{}", user=self.owner_user
        )
        self.scenario3 = _create_scenario(
            self.planning_area, "test scenario3", "{}", user=self.owner_user
        )
        self.empty_planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="empty test plan"
        )

        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan2"
        )
        self.owner_user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}", self.owner_user2
        )

        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_update_scenario_result(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        output = json.loads(response.content)
        self.assertEqual(output["id"], self.scenario.pk)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, json.dumps({"result1": "test result"}))
        self.assertEqual(
            scenario_result.run_details, json.dumps({"details": "super duper details"})
        )

    def test_update_scenario_result_twice(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        payload = json.dumps(
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
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
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
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"scenario_id": self.scenario.pk, "status": ScenarioResultStatus.RUNNING}
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, None)
        self.assertEqual(scenario_result.run_details, None)

    def test_update_scenario_result_result_only(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"comment": "test comment"}),
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
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
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "scenario_id": self.scenario.pk,
                "run_details": json.dumps({"comment": "test comment"}),
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
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
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"scenario_id": self.scenario.pk, "status": ScenarioResultStatus.PENDING}
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Invalid new state")

    def test_update_scenario_result_bad_status_pending_to_success(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {"scenario_id": self.scenario.pk, "status": ScenarioResultStatus.SUCCESS}
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Invalid new state")

    # This works since EPs don't have a user context.
    # TODO: Update when we have EPs sending a credential over.
    def test_update_scenario_result_not_logged_in(self):
        payload = json.dumps(
            {
                "scenario_id": self.scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
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
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "scenario_id": self.owner_user2scenario.pk,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenario_result = ScenarioResult.objects.get(
            scenario__id=self.owner_user2scenario.pk
        )
        self.assertEqual(scenario_result.status, ScenarioResultStatus.RUNNING)
        self.assertEqual(scenario_result.result, json.dumps({"result1": "test result"}))
        self.assertEqual(
            scenario_result.run_details, json.dumps({"details": "super duper details"})
        )

    def test_update_scenario_result_nonexistent_scenario(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps(
            {
                "scenario_id": 99999,
                "result": json.dumps({"result1": "test result"}),
                "run_details": json.dumps({"details": "super duper details"}),
                "status": ScenarioResultStatus.RUNNING,
            }
        )
        response = self.client.post(
            reverse("planning:update_scenario_result"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertRegex(str(response.content), r"does not exist")


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
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan"
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
        self.empty_planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="empty test plan"
        )

        self.owner_user2 = User.objects.create(username="testuser2")
        self.owner_user2.set_password("12345")
        self.owner_user2.save()
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan2"
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
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_list_scenario_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.planning_area2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content, {"error": "User has no permission to view planning area"}
        )

    def test_list_scenario_collab_user(self):
        self.client.force_authenticate(self.collab_user)
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

    def test_list_scenario_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
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

    def test_list_scenario_unprivileged_user(self):
        self.client.force_authenticate(self.unprivileged_user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content, {"error": "User has no permission to view planning area"}
        )

    def test_list_scenario_empty_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": self.empty_planning_area.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        self.assertEqual(len(scenarios), 0)

    def test_list_scenario_nonexistent_planning_area(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:list_scenarios_for_planning_area"),
            {"planning_area": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertJSONEqual(
            response.content, {"error": "Planning Area does not exist."}
        )


class GetScenarioTest(APITransactionTestCase):
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
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan"
        )
        self.scenario = _create_scenario(
            self.planning_area,
            "test scenario",
            self.configuration,
            user=self.owner_user,
        )

        self.owner_user2 = User.objects.create(username="testuser2")
        self.owner_user2.set_password("12345")
        self.owner_user2.save()
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan2"
        )
        self.scenario2 = _create_scenario(
            self.planning_area2,
            "test scenario2",
            self.configuration,
            user=self.owner_user2,
        )
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
        )

        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
        )
        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    def test_get_scenario(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        response_json = response.json()
        self.assertIsNotNone(response_json["created_at"])
        self.assertIsNotNone(response_json["updated_at"])

    def test_get_scenario_as_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        response_json = response.json()
        self.assertIsNotNone(response_json["created_at"])
        self.assertIsNotNone(response_json["updated_at"])

    def test_get_scenario_not_logged_in(self):
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_get_scenario_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {"message": "You do not have permission to view this scenario"},
        )

    def test_get_scenario_nonexistent_scenario(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertJSONEqual(
            response.content, {"error": "Scenario matching query does not exist."}
        )

    def test_get_scenario_with_results(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:get_scenario_by_id"),
            {"id": self.scenario.pk, "show_results": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["name"], "test scenario")
        self.assertEqual(result["user"], self.owner_user.pk)
        self.assertEqual(
            result["scenario_result"]["status"], ScenarioResultStatus.PENDING
        )


class GetScenarioDownloadTest(APITransactionTestCase):
    def setUp(self):
        super().setUp()
        self.set_verbose = True
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
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan"
        )
        self.scenario = _create_scenario(
            self.planning_area, "test scenario", "{}", user=self.owner_user
        )

        # set scenario result status to success
        self.scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.scenario_result.status = ScenarioResultStatus.SUCCESS
        self.scenario_result.save()

        # generate fake data in a directory that corresponds to this scenario name
        self.mock_project_path = (
            str(settings.OUTPUT_DIR) + "/" + str(self.scenario.uuid)
        )

        # this will also make the output directory that we currently don't commit
        os.makedirs(self.mock_project_path, exist_ok=True)
        self.mock_project_file = os.path.join(self.mock_project_path, "fake_data.txt")
        with open(self.mock_project_file, "w") as handle:
            print("Just test data", file=handle)

        # create a second scenario with a different user
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2, name="test plan2"
        )
        self.scenario2 = _create_scenario(
            self.planning_area2, "test scenario2", "{}", user=self.owner_user2
        )
        # set scenario result status to success
        self.scenario2_result = ScenarioResult.objects.get(
            scenario__id=self.scenario2.pk
        )
        self.scenario2_result.status = ScenarioResultStatus.SUCCESS
        self.scenario2_result.save()
        create_collaborator_record(
            self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
        )
        create_collaborator_record(
            self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
        )
        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    def tearDown(self):
        os.remove(self.mock_project_file)
        os.rmdir(self.mock_project_path)
        return super().tearDown()

    def test_get_scenario_with_zip(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:download_csv"), {"id": self.scenario.pk}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/zip")
        self.assertIsInstance(response.content, bytes)

    def test_download_csv_not_logged_in(self):
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    def test_get_scenario_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertRegex(str(response.content), r"does not exist")

    def test_get_scenario_collab_user(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/zip")
        self.assertIsInstance(response.content, bytes)

    def test_get_scenario_viewer_user(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/zip")
        self.assertIsInstance(response.content, bytes)

    def test_get_scenario_unprivileged_user(self):
        self.client.force_authenticate(self.unprivileged_user)
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertRegex(str(response.content), r"does not exist")

    def test_get_scenario_without_project_data(self):
        self.client.force_authenticate(self.owner_user2)
        self.scenario2_result.status = ScenarioResultStatus.SUCCESS
        self.scenario2_result.save()

        self.client.force_authenticate(self.owner_user2)
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario2.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertRegex(str(response.content), r"Scenario files cannot be read")

    def test_get_scenario_without_success_status_still_returns_data(self):
        self.client.force_authenticate(self.owner_user)
        self.scenario_result.status = ScenarioResultStatus.FAILURE
        self.scenario_result.save()

        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": self.scenario.pk},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_get_scenario_nonexistent_scenario(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.get(
            reverse("planning:download_csv"),
            {"id": 99999},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertRegex(str(response.content), r"does not exist")


class DeleteScenarioTest(APITransactionTestCase):
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
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner_user, name="test plan"
        )
        self.scenario = _create_scenario(
            self.planning_area, "test scenario", "{}", user=self.owner_user
        )
        self.scenario2 = _create_scenario(
            self.planning_area, "test scenario2", "{}", user=self.owner_user
        )
        self.scenario3 = _create_scenario(
            self.planning_area, "test scenario3", "{}", user=self.owner_user
        )

        self.owner_user2 = User.objects.create(username="testuser2")
        self.owner_user2.set_password("12345")
        self.owner_user2.save()
        self.planning_area2 = PlanningAreaFactory.create(
            user=self.owner_user2,
            name="test plan2",
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

    def test_delete_scenario(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"scenario_id": self.scenario.pk})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 3)
        self.assertEqual(ScenarioResult.objects.count(), 3)

    def test_delete_scenario_multiple_owned(self):
        self.client.force_authenticate(self.owner_user)
        scenario_ids = [self.scenario.pk, self.scenario2.pk]
        payload = json.dumps({"scenario_id": scenario_ids})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    # Silently does nothing for the non-owned scenario.
    def test_delete_scenario_multiple_partially_owned(self):
        self.client.force_authenticate(self.owner_user)
        scenario_ids = [
            self.scenario.pk,
            self.scenario2.pk,
            self.owner_user2scenario.pk,
        ]
        payload = json.dumps({"scenario_id": scenario_ids})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 2)
        self.assertEqual(ScenarioResult.objects.count(), 2)

    def test_delete_scenario_not_logged_in(self):
        payload = json.dumps({"scenario_id": self.scenario.pk})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)
        self.assertJSONEqual(response.content, {"error": "Authentication Required"})

    # Silently does nothing.
    def test_delete_scenario_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"scenario_id": self.owner_user2scenario.pk})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    # Silently does nothing.
    def test_delete_scenario_nonexistent_id(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({"scenario_id": 99999})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario_as_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        payload = json.dumps({"scenario_id": self.owner_user2scenario.pk})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario_as_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        payload = json.dumps({"scenario_id": self.owner_user2scenario.pk})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario_missing_id(self):
        self.client.force_authenticate(self.owner_user)
        payload = json.dumps({})
        response = self.client.post(
            reverse("planning:delete_scenario"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)
        self.assertRegex(str(response.content), r"Must specify scenario id")
