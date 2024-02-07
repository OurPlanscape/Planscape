from django.test import TransactionTestCase
from django.contrib.auth.models import User
from collaboration.models import Collaborator, Role
from collaboration.utils import (
    can_add_collaborators,
    can_add_scenario,
    can_archive_scenario,
    can_change_collaborators,
    can_delete_collaborators,
    can_view_collaborators,
    can_view_planning_area,
    can_view_scenario,
)
from planning.models import PlanningArea, Scenario
from django.contrib.contenttypes.models import ContentType


class PermissionsTest(TransactionTestCase):
    def setUp(self):
        # create user
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        # create second user (invitee?)
        self.invitee = User.objects.create(username="invitee")
        self.invitee.set_password("12345")
        self.invitee.save()

        # create planning area
        self.planning_area = PlanningArea.objects.create(
            user=self.user,
            name="Test Planning Area",
            region_name="sierra-nevada",
            geometry=None,
            notes="",
        )
        self.planning_area.save()

        self.scenario = Scenario.objects.create(
            user=self.user, planning_area=self.planning_area, name="a scenario"
        )
        self.scenario.save()

    def create_collaborator_record(self, role: Role):
        planning_area_type = ContentType.objects.get(
            app_label="planning", model="planningarea"
        )
        collaborator = Collaborator.objects.create(
            email="john@doe.com",
            collaborator=self.invitee,
            role=role,
            inviter=self.user,
            content_type=planning_area_type,
            object_pk=self.planning_area.id,
        )
        collaborator.save()

    # Viewing Planning Area

    def test_creator_can_view_planning_area(self):
        self.assertTrue(can_view_planning_area(self.user, self.planning_area))

    def test_not_invited_cannot_view_planning_area(self):
        self.assertFalse(can_view_planning_area(self.invitee, self.planning_area))

    def test_viewer_can_view_planning_area(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertTrue(can_view_planning_area(self.invitee, self.planning_area))

    def test_collaborator_can_view_planning_area(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(can_view_planning_area(self.invitee, self.planning_area))

    def test_owner_can_view_planning_area(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_view_planning_area(self.invitee, self.planning_area))

    # Viewing Scenarios

    def test_creator_can_view_scenario(self):
        self.assertTrue(can_view_scenario(self.user, self.planning_area))

    def test_not_invited_cannot_view_scenario(self):
        self.assertFalse(can_view_scenario(self.invitee, self.planning_area))

    def test_viewer_can_view_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertTrue(can_view_scenario(self.invitee, self.planning_area))

    def test_collaborator_can_view_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(can_view_scenario(self.invitee, self.planning_area))

    def test_owner_can_view_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_view_scenario(self.invitee, self.planning_area))

    # Adding Scenarios

    def test_creator_can_add_scenario(self):
        self.assertTrue(can_add_scenario(self.user, self.planning_area))

    def test_not_invited_cannot_add_scenario(self):
        self.assertFalse(can_add_scenario(self.invitee, self.planning_area))

    def test_viewer_cannot_add_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(can_add_scenario(self.invitee, self.planning_area))

    def test_collaborator_can_add_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertTrue(can_add_scenario(self.invitee, self.planning_area))

    def test_owner_can_add_scenario(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_add_scenario(self.invitee, self.planning_area))

    # Change (Archive) Scenarios

    def test_creator_can_archive_scenario(self):
        self.assertTrue(
            can_archive_scenario(self.user, self.planning_area, self.scenario)
        )

    def test_not_invited_cannot_archive_scenario(self):
        self.assertFalse(
            can_archive_scenario(self.invitee, self.planning_area, self.scenario)
        )

    def test_viewer_cannot_archive_scenario(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(
            can_archive_scenario(self.invitee, self.planning_area, self.scenario)
        )

    def test_collaborator_cannot_archive_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(
            can_archive_scenario(self.invitee, self.planning_area, self.scenario)
        )

    def test_scenario_owner_can_archive_scenario(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        # create a scenario with this user
        scenario = Scenario.objects.create(
            user=self.invitee,
            planning_area=self.planning_area,
            name="a different scenario",
        )
        scenario.save()
        # assert that it can archive even as collaborator
        self.assertTrue(
            can_archive_scenario(self.invitee, self.planning_area, scenario)
        )

    # View Collaborators

    def test_creator_can_view_collaborators(self):
        self.assertTrue(can_view_collaborators(self.user, self.planning_area))

    def test_not_invited_cannot_view_collaborator(self):
        self.assertFalse(can_view_collaborators(self.invitee, self.planning_area))

    def test_viewer_cannot_view_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(can_view_collaborators(self.invitee, self.planning_area))

    def test_collaborator_cannot_view_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(can_view_collaborators(self.invitee, self.planning_area))

    def test_owner_can_view_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_view_collaborators(self.invitee, self.planning_area))

    # Add Collaborators

    def test_creator_can_add_collaborators(self):
        self.assertTrue(can_add_collaborators(self.user, self.planning_area))

    def test_not_invited_cannot_add_collaborator(self):
        self.assertFalse(can_add_collaborators(self.invitee, self.planning_area))

    def test_viewer_cannot_add_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(can_add_collaborators(self.invitee, self.planning_area))

    def test_collaborator_cannot_add_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(can_add_collaborators(self.invitee, self.planning_area))

    def test_owner_can_add_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_add_collaborators(self.invitee, self.planning_area))

    # Change Collaborators

    def test_creator_can_change_collaborators(self):
        self.assertTrue(can_change_collaborators(self.user, self.planning_area))

    def test_not_invited_cannot_change_collaborator(self):
        self.assertFalse(can_change_collaborators(self.invitee, self.planning_area))

    def test_viewer_cannot_change_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(can_change_collaborators(self.invitee, self.planning_area))

    def test_collaborator_cannot_change_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(can_change_collaborators(self.invitee, self.planning_area))

    def test_owner_can_change_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_change_collaborators(self.invitee, self.planning_area))

    # Delete Collaborators

    def test_creator_can_delete_collaborators(self):
        self.assertTrue(can_delete_collaborators(self.user, self.planning_area))

    def test_not_invited_cannot_delete_collaborator(self):
        self.assertFalse(can_delete_collaborators(self.invitee, self.planning_area))

    def test_viewer_cannot_delete_collaborator(self):
        self.create_collaborator_record(Role.VIEWER)
        self.assertFalse(can_delete_collaborators(self.invitee, self.planning_area))

    def test_collaborator_cannot_delete_collaborator(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        self.assertFalse(can_delete_collaborators(self.invitee, self.planning_area))

    def test_owner_can_delete_collaborator(self):
        self.create_collaborator_record(Role.OWNER)
        self.assertTrue(can_delete_collaborators(self.invitee, self.planning_area))
