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
        self.old_notes = "Truly, you have a dizzying intellect."
        self.old_name = "Man in black"
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.storable_geometry
        )
        self.scenario = _create_scenario(
            self.planning_area, self.old_name, self.configuration, self.owner_user, self.old_notes
        )

        self.owner_user2 = User.objects.create(username="testuser2")
        self.owner_user2.set_password("12345")
        self.owner_user2.save()
        self.planning_area2 = _create_planning_area(
            self.owner_user2, "test plan2", self.storable_geometry
        )
        self.owner_user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", self.configuration, user=self.owner_user2
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
        print(f"Response in test_update_name_only: {response.content}")
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
        print(f"Response in test_update_status_only_by_owner: {response.content}")
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
        print(f"Response in test_update_status_bad_value: {response.content}")

        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(
            response.content,
            {"error": "Status is not valid."},
        )
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
        self.assertJSONEqual(
            response.content,
            {"configuration": ["This field is required."]},
        )

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
        self.assertJSONEqual(
            response.content,
            {"configuration": ["This field is required."]},
        )


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
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.storable_geometry
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
        self.planning_area2 = _create_planning_area(
            self.owner_user2, "test plan2", self.storable_geometry
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
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.storable_geometry
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
        self.planning_area2 = _create_planning_area(
            self.owner_user2, "test plan2", self.storable_geometry
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


# class GetScenarioDownloadTest(APITransactionTestCase):
#     def setUp(self):
#         super().setUp()
#         self.set_verbose = True
#         if Permissions.objects.count() == 0:
#             reset_permissions()

#         self.test_users = _create_test_user_set()
#         self.owner_user = self.test_users["owner"]
#         self.owner_user2 = self.test_users["owner2"]
#         self.collab_user = self.test_users["collaborator"]
#         self.viewer_user = self.test_users["viewer"]
#         self.unprivileged_user = self.test_users["unprivileged"]

#         self.geometry = {
#             "type": "MultiPolygon",
#             "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
#         }
#         self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
#         self.planning_area = _create_planning_area(
#             self.owner_user, "test plan", self.storable_geometry
#         )
#         self.scenario = _create_scenario(
#             self.planning_area, "test scenario", "{}", user=self.owner_user
#         )

#         # set scenario result status to success
#         self.scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
#         self.scenario_result.status = ScenarioResultStatus.SUCCESS
#         self.scenario_result.save()

#         # generate fake data in a directory that corresponds to this scenario name
#         self.mock_project_path = (
#             str(settings.OUTPUT_DIR) + "/" + str(self.scenario.uuid)
#         )

#         # this will also make the output directory that we currently don't commit
#         os.makedirs(self.mock_project_path, exist_ok=True)
#         self.mock_project_file = os.path.join(self.mock_project_path, "fake_data.txt")
#         with open(self.mock_project_file, "w") as handle:
#             print("Just test data", file=handle)

#         # create a second scenario with a different user
#         self.planning_area2 = _create_planning_area(
#             self.owner_user2, "test plan2", self.storable_geometry
#         )
#         self.scenario2 = _create_scenario(
#             self.planning_area2, "test scenario2", "{}", user=self.owner_user2
#         )
#         # set scenario result status to success
#         self.scenario2_result = ScenarioResult.objects.get(
#             scenario__id=self.scenario2.pk
#         )
#         self.scenario2_result.status = ScenarioResultStatus.SUCCESS
#         self.scenario2_result.save()
#         create_collaborator_record(
#             self.owner_user, self.collab_user, self.planning_area, Role.COLLABORATOR
#         )
#         create_collaborator_record(
#             self.owner_user, self.viewer_user, self.planning_area, Role.VIEWER
#         )
#         self.assertEqual(Scenario.objects.count(), 2)
#         self.assertEqual(ScenarioResult.objects.count(), 2)

#     def tearDown(self):
#         os.remove(self.mock_project_file)
#         os.rmdir(self.mock_project_path)
#         return super().tearDown()

#     def test_get_scenario_with_zip(self):
#         self.client.force_authenticate(self.owner_user)
#         response = self.client.get(
#             reverse("planning:download_csv"), {"id": self.scenario.pk}
#         )
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.headers["Content-Type"], "application/zip")
#         self.assertIsInstance(response.content, bytes)

#     def test_download_csv_not_logged_in(self):
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 401)
#         self.assertJSONEqual(response.content, {"error": "Authentication Required"})

#     def test_get_scenario_wrong_user(self):
#         self.client.force_authenticate(self.owner_user)
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario2.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 403)
#         self.assertRegex(str(response.content), r"does not exist")

#     def test_get_scenario_collab_user(self):
#         self.client.force_authenticate(self.collab_user)
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.headers["Content-Type"], "application/zip")
#         self.assertIsInstance(response.content, bytes)

#     def test_get_scenario_viewer_user(self):
#         self.client.force_authenticate(self.viewer_user)
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.headers["Content-Type"], "application/zip")
#         self.assertIsInstance(response.content, bytes)

#     def test_get_scenario_unprivileged_user(self):
#         self.client.force_authenticate(self.unprivileged_user)
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 403)
#         self.assertRegex(str(response.content), r"does not exist")

#     def test_get_scenario_without_project_data(self):
#         self.client.force_authenticate(self.owner_user2)
#         self.scenario2_result.status = ScenarioResultStatus.SUCCESS
#         self.scenario2_result.save()

#         self.client.force_authenticate(self.owner_user2)
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario2.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 400)
#         self.assertRegex(str(response.content), r"Scenario files cannot be read")

#     def test_get_scenario_without_success_status_still_returns_data(self):
#         self.client.force_authenticate(self.owner_user)
#         self.scenario_result.status = ScenarioResultStatus.FAILURE
#         self.scenario_result.save()

#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": self.scenario.pk},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 200)

#     def test_get_scenario_nonexistent_scenario(self):
#         self.client.force_authenticate(self.owner_user)
#         response = self.client.get(
#             reverse("planning:download_csv"),
#             {"id": 99999},
#             content_type="application/json",
#         )
#         self.assertEqual(response.status_code, 404)
#         self.assertRegex(str(response.content), r"does not exist")


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
        self.planning_area = _create_planning_area(
            self.owner_user, "test plan", self.storable_geometry
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

    def test_delete_scenario(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.delete(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "pk": self.scenario.pk,
                    "planningarea_pk": self.planning_area.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(Scenario.objects.count(), 3)
        self.assertEqual(ScenarioResult.objects.count(), 3)

    # TODO: no endpoint for multiple scenario deletions yet
    # def test_delete_scenario_multiple_owned(self):
    #     self.client.force_authenticate(self.owner_user)
    #     scenario_ids = [self.scenario.pk, self.scenario2.pk]
    #     payload = json.dumps({"scenario_id": scenario_ids})
    #     response = self.client.post(
    #         reverse("planning:delete_scenario"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(Scenario.objects.count(), 2)
    #     self.assertEqual(ScenarioResult.objects.count(), 2)

    # Silently does nothing for the non-owned scenario.
    # def test_delete_scenario_multiple_partially_owned(self):
    #     self.client.force_authenticate(self.owner_user)
    #     scenario_ids = [
    #         self.scenario.pk,
    #         self.scenario2.pk,
    #         self.owner_user2scenario.pk,
    #     ]
    #     payload = json.dumps({"scenario_id": scenario_ids})
    #     response = self.client.delete(
    #         reverse("planning:scenarios-detail"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(Scenario.objects.count(), 2)
    #     self.assertEqual(ScenarioResult.objects.count(), 2)

    def test_delete_scenario_not_logged_in(self):
        response = self.client.delete(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "pk": self.scenario.pk,
                    "planningarea_pk": self.planning_area.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)
        self.assertJSONEqual(
            response.content,
            {"detail": "Authentication credentials were not provided."},
        )

    # Silently does nothing.
    def test_delete_scenario_wrong_user(self):
        self.client.force_authenticate(self.owner_user)
        response = self.client.delete(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "pk": self.owner_user2scenario.pk,
                    "planningarea_pk": self.planning_area2.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    # # Silently does nothing.
    # def test_delete_scenario_nonexistent_id(self):
    #     self.client.force_authenticate(self.owner_user)
    #     payload = json.dumps({"scenario_id": 99999})
    #     response = self.client.delete(
    #         reverse("planning:scenarios-detail"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(Scenario.objects.count(), 4)
    #     self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario_as_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        response = self.client.delete(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "pk": self.owner_user2scenario.pk,
                    "planningarea_pk": self.planning_area2.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def test_delete_scenario_as_viewer(self):
        self.client.force_authenticate(self.viewer_user)
        response = self.client.delete(
            reverse(
                "planning:scenarios-detail",
                kwargs={
                    "pk": self.owner_user2scenario.pk,
                    "planningarea_pk": self.planning_area2.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    # def test_delete_scenario_missing_id(self):
    #     self.client.force_authenticate(self.owner_user)
    #     payload = json.dumps({})
    #     response = self.client.delete(
    #         reverse("planning:scenarios-detail"),
    #         payload,
    #         content_type="application/json",
    #     )
    #     self.assertEqual(response.status_code, 400)
    #     self.assertEqual(Scenario.objects.count(), 4)
    #     self.assertEqual(ScenarioResult.objects.count(), 4)
    #     self.assertRegex(str(response.content), r"Must specify scenario id")
