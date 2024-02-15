from django.test import TestCase
from django.contrib.auth.models import User
from collaboration.models import Role
from django.contrib.contenttypes.models import ContentType

from planning.models import PlanningArea, PlanningAreaCollaborator, Scenario


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
        collaborator = PlanningAreaCollaborator(
            email="john@doe.com",
            collaborator=self.invitee,
            role=role,
            inviter=self.user,
            object_pk=self.planning_area.pk,
        )
        collaborator.save()
        return collaborator

    def dummy_collaborator(self):
        content_type = ContentType.objects.get_for_model(self.planning_area)
        return PlanningAreaCollaborator(
            content_type=content_type, object_pk=self.planning_area.pk
        )

    # Viewing Planning Area

    def test_creator_can_view_planning_area(self):
        self.assertTrue(self.planning_area.can_view(self.user))

    def test_not_invited_cannot_view_planning_area(self):
        self.assertFalse(self.planning_area.can_view(self.invitee))

    def test_viewer_can_view_planning_area(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertTrue(self.planning_area.can_view(self.invitee))

    def test_collaborator_can_view_planning_area(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(self.planning_area.can_view(self.invitee))

    def test_owner_can_view_planning_area(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(self.planning_area.can_view(self.invitee))

    # Viewing Scenarios

    def test_creator_can_view_scenario(self):
        self.assertTrue(self.scenario.can_view(self.user))

    def test_not_invited_cannot_view_scenario(self):
        self.assertFalse(self.scenario.can_view(self.invitee))

    def test_viewer_can_view_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertTrue(self.scenario.can_view(self.invitee))

    def test_collaborator_can_view_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(self.scenario.can_view(self.invitee))

    def test_owner_can_view_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(self.scenario.can_view(self.invitee))

    # Adding Scenarios

    def test_creator_can_add_scenario(self):
        self.assertTrue(self.scenario.can_add(self.user))

    def test_not_invited_cannot_add_scenario(self):
        self.assertFalse(self.scenario.can_add(self.invitee))

    def test_viewer_cannot_add_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(self.scenario.can_add(self.invitee))

    def test_collaborator_can_add_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(self.scenario.can_add(self.invitee))

    def test_owner_can_add_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(self.scenario.can_add(self.invitee))

    # Change (Archive) Scenarios

    def test_creator_can_archive_scenario(self):
        self.assertTrue(self.scenario.can_change(self.user))

    def test_not_invited_cannot_archive_scenario(self):
        self.assertFalse(self.scenario.can_change(self.invitee))

    def test_viewer_cannot_archive_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(self.scenario.can_change(self.invitee))

    def test_collaborator_cannot_archive_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(self.scenario.can_change(self.invitee))

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
        self.assertTrue(self.scenario.can_change(self.invitee))

    # Delete scenarios
    def test_creator_can_delete_scenarios(self):
        self.assertTrue(self.scenario.can_delete(self.user))

    def test_not_invited_cannot_delete_scenarios(self):
        self.assertFalse(self.scenario.can_delete(self.invitee))

    def test_viewer_cannot_delete_scenarios(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(self.scenario.can_delete(self.invitee))

    def test_collaborator_cannot_delete_scenarios(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(self.scenario.can_delete(self.invitee))

    def test_owner_cannot_delete_scenarios(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertFalse(self.scenario.can_delete(self.invitee))

    # View Collaborators

    def test_creator_can_view_collaborators(self):
        collaborator = self.dummy_collaborator()

        self.assertTrue(collaborator.can_view(self.user))

    def test_not_invited_cannot_view_collaborator(self):
        collaborator = self.dummy_collaborator()
        self.assertFalse(collaborator.can_view(self.invitee))

    def test_viewer_cannot_view_collaborator(self):
        collaborator = self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(collaborator.can_view(self.invitee))

    def test_collaborator_cannot_view_collaborator(self):
        collaborator = self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(collaborator.can_view(self.invitee))

    def test_owner_can_view_collaborator(self):
        collaborator = self.create_collaborator_record(Role.OWNER)
        self.assertTrue(collaborator.can_view(self.invitee))

    # Add Collaborators

    def test_creator_can_add_collaborators(self):
        collaborator = self.dummy_collaborator()
        self.assertTrue(collaborator.can_add(self.user))

    def test_not_invited_cannot_add_collaborator(self):
        collaborator = self.dummy_collaborator()
        self.assertFalse(collaborator.can_add(self.invitee))

    def test_viewer_cannot_add_collaborator(self):
        collaborator = self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(collaborator.can_add(self.invitee))

    def test_collaborator_cannot_add_collaborator(self):
        collaborator = self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(collaborator.can_add(self.invitee))

    def test_owner_can_add_collaborator(self):
        collaborator = self.create_collaborator_record(Role.OWNER)
        self.assertTrue(collaborator.can_add(self.invitee))

    # Change Collaborators

    def test_creator_can_change_collaborators(self):
        collaborator = self.dummy_collaborator()
        self.assertTrue(collaborator.can_change(self.user))

    def test_not_invited_cannot_change_collaborator(self):
        collaborator = self.dummy_collaborator()
        self.assertFalse(collaborator.can_change(self.invitee))

    def test_viewer_cannot_change_collaborator(self):
        collaborator = self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(collaborator.can_change(self.invitee))

    def test_collaborator_cannot_change_collaborator(self):
        collaborator = self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(collaborator.can_change(self.invitee))

    def test_owner_can_change_collaborator(self):
        collaborator = self.create_collaborator_record(Role.OWNER)
        self.assertTrue(collaborator.can_change(self.invitee))

    # Delete Collaborators

    def test_creator_can_delete_collaborators(self):
        collaborator = self.dummy_collaborator()
        self.assertTrue(collaborator.can_delete(self.user))

    def test_not_invited_cannot_delete_collaborator(self):
        collaborator = self.dummy_collaborator()
        self.assertFalse(collaborator.can_delete(self.invitee))

    def test_viewer_cannot_delete_collaborator(self):
        collaborator = self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(collaborator.can_delete(self.invitee))

    def test_collaborator_cannot_delete_collaborator(self):
        collaborator = self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(collaborator.can_delete(self.invitee))

    def test_owner_can_delete_collaborator(self):
        collaborator = self.create_collaborator_record(Role.OWNER)
        self.assertTrue(collaborator.can_delete(self.invitee))
