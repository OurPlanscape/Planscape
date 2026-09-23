from climate_foresight.tests.factories import ClimateForesightRunFactory
from collaboration.models import Role, UserObjectRole
from collaboration.permissions import (
    ClimateForesightPermission,
    PlanningAreaPermission,
    ScenarioPermission,
)
from collaboration.services import get_content_type
from django.urls import reverse
from impacts.permissions import TreatmentPlanPermission
from impacts.tests.factories import TreatmentPlanFactory
from planning.models import PlanningArea, Scenario
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planscape.tests.factories import UserFactory
from rest_framework.test import APITestCase

from workspaces.access import (
    COLLABORATOR_PERMISSIONS,
    OWNER_PERMISSIONS,
    VIEWER_PERMISSIONS,
)
from workspaces.models import WorkspaceRole
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
)

LIST_URL = "api:planning:planningareas-list"
DETAIL_URL = "api:planning:planningareas-detail"


class PlanningAreaWorkspaceAccessTest(APITestCase):
    def setUp(self):
        self.creator = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.creator)
        self.planning_area = PlanningAreaFactory.create(
            user=self.creator, workspace=self.workspace
        )
        PlanningAreaFactory.create(user=self.creator, workspace=self.workspace)
        self.owner = self._member(WorkspaceRole.OWNER)
        self.collaborator = self._member(WorkspaceRole.COLLABORATOR)
        self.viewer = self._member(WorkspaceRole.VIEWER)
        self.stranger = UserFactory.create()

    def _member(self, role):
        user = UserFactory.create()
        UserAccessWorkspaceFactory.create(
            user=user, workspace=self.workspace, role=role
        )
        return user

    def _list_workspace_planning_areas(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse(LIST_URL), {"workspace": self.workspace.pk})
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def test_members_see_the_workspace_planning_areas(self):
        expected = [
            (self.owner, "Owner", OWNER_PERMISSIONS),
            (self.collaborator, "Collaborator", COLLABORATOR_PERMISSIONS),
            (self.viewer, "Viewer", VIEWER_PERMISSIONS),
        ]
        for user, role, permissions in expected:
            with self.subTest(role=role):
                results = self._list_workspace_planning_areas(user)
                self.assertEqual(len(results), 2)
                for planning_area in results:
                    self.assertEqual(planning_area["role"], role)
                    self.assertCountEqual(planning_area["permissions"], permissions)

    def test_creator_keeps_owner_permissions(self):
        results = self._list_workspace_planning_areas(self.creator)

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["role"], "Creator")
        self.assertCountEqual(results[0]["permissions"], OWNER_PERMISSIONS)

    def test_non_members_see_nothing(self):
        self.assertEqual(self._list_workspace_planning_areas(self.stranger), [])

    def test_planning_area_sharing_does_not_apply_inside_workspaces(self):
        UserObjectRole.objects.create(
            email=self.stranger.email,
            inviter=self.creator,
            collaborator=self.stranger,
            role=Role.OWNER,
            content_type=get_content_type("PlanningArea"),
            object_pk=self.planning_area.pk,
        )

        self.assertEqual(self._list_workspace_planning_areas(self.stranger), [])
        self.assertFalse(
            PlanningAreaPermission.can_view(self.stranger, self.planning_area)
        )

    def test_members_can_open_a_planning_area(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(
            reverse(DETAIL_URL, kwargs={"pk": self.planning_area.pk})
        )

        self.assertEqual(response.status_code, 200)

    def test_only_the_creator_or_workspace_owners_can_delete(self):
        self.assertTrue(
            PlanningAreaPermission.can_remove(self.creator, self.planning_area)
        )
        self.assertTrue(
            PlanningAreaPermission.can_remove(self.owner, self.planning_area)
        )
        self.assertFalse(
            PlanningAreaPermission.can_remove(self.collaborator, self.planning_area)
        )

        url = reverse(DETAIL_URL, kwargs={"pk": self.planning_area.pk})
        self.client.force_authenticate(user=self.collaborator)
        self.assertEqual(self.client.delete(url).status_code, 403)

        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(PlanningArea.objects.filter(pk=self.planning_area.pk).exists())

    def test_scenario_access_follows_the_workspace_role(self):
        scenario = ScenarioFactory.create(planning_area=self.planning_area)

        self.assertIn(scenario, Scenario.objects.list_by_user(self.viewer))
        self.assertNotIn(scenario, Scenario.objects.list_by_user(self.stranger))
        self.assertTrue(ScenarioPermission.can_view(self.viewer, scenario))
        self.assertFalse(
            PlanningAreaPermission.can_add_scenario(self.viewer, self.planning_area)
        )
        self.assertTrue(
            PlanningAreaPermission.can_add_scenario(
                self.collaborator, self.planning_area
            )
        )
        self.assertFalse(ScenarioPermission.can_change(self.collaborator, scenario))
        self.assertTrue(ScenarioPermission.can_change(self.owner, scenario))

    def test_treatment_plan_access_follows_the_workspace_role(self):
        tx_plan = TreatmentPlanFactory.create(
            scenario__planning_area=self.planning_area
        )

        self.assertTrue(TreatmentPlanPermission.can_view(self.viewer, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_add(self.viewer, tx_plan.scenario))
        self.assertTrue(
            TreatmentPlanPermission.can_add(self.collaborator, tx_plan.scenario)
        )
        self.assertFalse(TreatmentPlanPermission.can_run(self.collaborator, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_run(self.owner, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_view(self.stranger, tx_plan))

    def test_climate_foresight_access_follows_the_workspace_role(self):
        run = ClimateForesightRunFactory.create(planning_area=self.planning_area)

        self.assertTrue(ClimateForesightPermission.can_view(self.viewer, run))
        self.assertFalse(ClimateForesightPermission.can_add(self.viewer, run))
        self.assertTrue(ClimateForesightPermission.can_add(self.collaborator, run))
        self.assertFalse(ClimateForesightPermission.can_view(self.stranger, run))
