from django.test import TestCase
from django.contrib.auth.models import User
from collaboration.permissions import (
    CollaboratorPermission,
    PlanningAreaPermission,
    ScenarioPermission,
)
from collaboration.models import Role
from collaboration.utils import (
    create_collaborator_record,
)
from collaboration.services import get_planningareas_for_user
from planning.models import PlanningArea, Scenario


class PermissionsTest(TestCase):
    def setUp(self):
        # create user
        self.user = self.setUser("test-user")
        # create second user (invitee)
        self.invitee = self.setUser("test-invitee")

        # create planning area
        self.planning_area = PlanningArea.objects.create(
            user=self.user,
            name="Test Planning Area",
            region_name="sierra-nevada",
            geometry=None,
            notes="",
        )
        self.planning_area.save()

        # create scenario
        self.scenario = Scenario.objects.create(
            user=self.user, planning_area=self.planning_area, name="a scenario"
        )
        self.scenario.save()

    def setUser(self, username):
        user = User.objects.create(username=username)
        user.set_password("12345")
        user.save()
        return user

    def create_collaborator_record(self, role: Role):
        create_collaborator_record(self.user, self.invitee, self.planning_area, role)

    # Viewing Planning Area

    def test_creator_can_view_planning_area(self):
        self.assertTrue(PlanningAreaPermission.can_view(self.user, self.planning_area))

    def test_not_invited_cannot_view_planning_area(self):
        self.assertFalse(
            PlanningAreaPermission.can_view(self.invitee, self.planning_area)
        )

    def test_viewer_can_view_planning_area(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertTrue(
            PlanningAreaPermission.can_view(self.invitee, self.planning_area)
        )

    def test_collaborator_can_view_planning_area(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(
            PlanningAreaPermission.can_view(self.invitee, self.planning_area)
        )

    def test_owner_can_view_planning_area(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(
            PlanningAreaPermission.can_view(self.invitee, self.planning_area)
        )

    # Viewing Scenarios

    def test_creator_can_view_scenario(self):
        self.assertTrue(ScenarioPermission.can_view(self.user, self.scenario))

    def test_not_invited_cannot_view_scenario(self):
        self.assertFalse(ScenarioPermission.can_view(self.invitee, self.scenario))

    def test_viewer_can_view_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertTrue(ScenarioPermission.can_view(self.invitee, self.scenario))

    def test_collaborator_can_view_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(ScenarioPermission.can_view(self.invitee, self.scenario))

    def test_owner_can_view_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(ScenarioPermission.can_view(self.invitee, self.scenario))

    # Adding Scenarios

    def test_creator_can_add_scenario(self):
        self.assertTrue(ScenarioPermission.can_add(self.user, self.scenario))

    def test_not_invited_cannot_add_scenario(self):
        self.assertFalse(ScenarioPermission.can_add(self.invitee, self.scenario))

    def test_viewer_cannot_add_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(ScenarioPermission.can_add(self.invitee, self.scenario))

    def test_collaborator_can_add_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(ScenarioPermission.can_add(self.invitee, self.scenario))

    def test_owner_can_add_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(ScenarioPermission.can_add(self.invitee, self.scenario))

    # Change (Archive) Scenarios

    def test_creator_can_archive_scenario(self):
        self.assertTrue(ScenarioPermission.can_change(self.user, self.scenario))

    def test_not_invited_cannot_archive_scenario(self):
        self.assertFalse(ScenarioPermission.can_change(self.invitee, self.scenario))

    def test_viewer_cannot_archive_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(ScenarioPermission.can_change(self.invitee, self.scenario))

    def test_collaborator_cannot_archive_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(ScenarioPermission.can_change(self.invitee, self.scenario))

    def test_scenario_owner_can_archive_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        # create a scenario with this user
        scenario = Scenario.objects.create(
            user=self.invitee,
            planning_area=self.planning_area,
            name="a different scenario",
        )
        scenario.save()
        # assert that it can archive even as collaborator
        self.assertTrue(ScenarioPermission.can_change(self.invitee, scenario))

    # Delete scenarios
    def test_creator_can_delete_scenarios(self):
        self.assertTrue(ScenarioPermission.can_delete(self.user, self.scenario))

    def test_not_invited_cannot_delete_scenarios(self):
        self.assertFalse(ScenarioPermission.can_delete(self.invitee, self.scenario))

    def test_viewer_cannot_delete_scenarios(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(ScenarioPermission.can_delete(self.invitee, self.scenario))

    def test_collaborator_cannot_delete_scenarios(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(ScenarioPermission.can_delete(self.invitee, self.scenario))

    def test_owner_cannot_delete_scenarios(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertFalse(ScenarioPermission.can_delete(self.invitee, self.scenario))

    # View Collaborators

    def test_creator_can_view_collaborators(self):
        self.assertTrue(CollaboratorPermission.can_view(self.user, self.planning_area))

    def test_not_invited_cannot_view_collaborator(self):
        self.assertFalse(
            CollaboratorPermission.can_view(self.invitee, self.planning_area)
        )

    def test_viewer_cannot_view_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(
            CollaboratorPermission.can_view(self.invitee, self.planning_area)
        )

    def test_collaborator_cannot_view_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(
            CollaboratorPermission.can_view(self.invitee, self.planning_area)
        )

    def test_owner_can_view_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(
            CollaboratorPermission.can_view(self.invitee, self.planning_area)
        )

    # Add Collaborators

    def test_creator_can_add_collaborators(self):
        self.assertTrue(CollaboratorPermission.can_add(self.user, self.planning_area))

    def test_not_invited_cannot_add_collaborator(self):
        self.assertFalse(
            CollaboratorPermission.can_add(self.invitee, self.planning_area)
        )

    def test_viewer_cannot_add_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(
            CollaboratorPermission.can_add(self.invitee, self.planning_area)
        )

    def test_collaborator_cannot_add_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(
            CollaboratorPermission.can_add(self.invitee, self.planning_area)
        )

    def test_owner_can_add_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(
            CollaboratorPermission.can_add(self.invitee, self.planning_area)
        )

    # Change Collaborators

    def test_creator_can_change_collaborators(self):
        self.assertTrue(
            CollaboratorPermission.can_change(self.user, self.planning_area)
        )

    def test_not_invited_cannot_change_collaborator(self):
        self.assertFalse(
            CollaboratorPermission.can_change(self.invitee, self.planning_area)
        )

    def test_viewer_cannot_change_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(
            CollaboratorPermission.can_change(self.invitee, self.planning_area)
        )

    def test_collaborator_cannot_change_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(
            CollaboratorPermission.can_change(self.invitee, self.planning_area)
        )

    def test_owner_can_change_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(
            CollaboratorPermission.can_change(self.invitee, self.planning_area)
        )

    # Delete Collaborators

    def test_creator_can_delete_collaborators(self):
        self.assertTrue(
            CollaboratorPermission.can_delete(self.user, self.planning_area)
        )

    def test_not_invited_cannot_delete_collaborator(self):
        self.assertFalse(
            CollaboratorPermission.can_delete(self.invitee, self.planning_area)
        )

    def test_viewer_cannot_delete_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(
            CollaboratorPermission.can_delete(self.invitee, self.planning_area)
        )

    def test_collaborator_cannot_delete_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(
            CollaboratorPermission.can_delete(self.invitee, self.planning_area)
        )

    def test_owner_can_delete_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(
            CollaboratorPermission.can_delete(self.invitee, self.planning_area)
        )


# TODO: This could probably live in the PlanningArea view tests
class PlanningAreaRolesTest(TestCase):
    def setUp(self):
        # create user
        self.user = self.setUser("test-creator")
        # create second user (invitee)
        self.invitee = self.setUser("test-invitee")

        # create multiple planning areas...
        self.planning_area_created = PlanningArea.objects.create(
            user=self.invitee,
            name="User Created This Planning Area",
            region_name="sierra-nevada",
            geometry=None,
            notes="",
        )
        self.planning_area_created.save()       
        
        self.planning_area_owned = PlanningArea.objects.create(
            user=self.user,
            name="User is an Owner of This Area",
            region_name="sierra-nevada",
            geometry=None,
            notes="",
        )
        self.planning_area_owned.save()
        create_collaborator_record(self.user, self.invitee, self.planning_area_owned, Role.OWNER)
       
        self.planning_area_editable = PlanningArea.objects.create(
            user=self.user,
            name="User Can Edit This Area",
            region_name="sierra-nevada",
            geometry=None,
            notes="",
        )
        self.planning_area_editable.save()
        create_collaborator_record(self.user, self.invitee, self.planning_area_editable, Role.COLLABORATOR)

       
        self.planning_area_viewable = PlanningArea.objects.create(
            user=self.user,
            name="User Can View This Area",
            region_name="sierra-nevada",
            geometry=None,
            notes="",
        )
        self.planning_area_viewable.save()
        create_collaborator_record(self.user, self.invitee, self.planning_area_viewable, Role.VIEWER)

    def setUser(self, username):
        user = User.objects.create(username=username)
        user.set_password("12345")
        user.save()
        return user

    def test_get_planningareas_for_user(self):
        areas = get_planningareas_for_user(self.invitee)
        for a in areas:
            print(f"we have area {a.name}")
