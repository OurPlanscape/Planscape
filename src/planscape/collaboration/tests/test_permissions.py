from django.test import TransactionTestCase
from django.contrib.auth.models import User
from collaboration.models import Collaborator, Role
from collaboration.utils import canViewPlanningArea
from planning.models import PlanningArea
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

    def creator_can_view_planning_area(self):
        can_view = canViewPlanningArea(self.user, self.planning_area)
        self.assertFalse(can_view)

    def test_not_invited_cannot_view_planning_area(self):
        can_view = canViewPlanningArea(self.invitee, self.planning_area)
        self.assertFalse(can_view)

    def test_viewer_can_view_planning_area(self):
        self.create_collaborator_record(Role.VIEWER)
        can_view = canViewPlanningArea(self.invitee, self.planning_area)
        self.assertTrue(can_view)

    def test_collaborator_can_view_planning_area(self):
        self.create_collaborator_record(Role.COLLABORATOR)
        can_view = canViewPlanningArea(self.invitee, self.planning_area)
        self.assertTrue(can_view)

    def test_owner_can_view_planning_area(self):
        self.create_collaborator_record(Role.OWNER)
        can_view = canViewPlanningArea(self.invitee, self.planning_area)
        self.assertTrue(can_view)
