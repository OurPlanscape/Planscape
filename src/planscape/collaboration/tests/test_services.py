from django.test import TransactionTestCase
from django.contrib.contenttypes.models import ContentType
from collaboration.models import UserObjectRole, Role
from collaboration.services import link_invites, validate_ownership, get_permissions
from planning.models import PlanningArea
from django.contrib.auth.models import User


class TestValidateOwnership(TransactionTestCase):
    def setUp(self):
        self.user1 = User(pk=1, email="foo@foo.com")
        self.user2 = User(pk=2, email="bar@bar.com")
        self.planning_area1 = PlanningArea(user=self.user1, region_name="a")
        self.planning_area2 = PlanningArea(user=self.user2, region_name="b")

    def test_validate_ownership_same_user(self):
        self.assertTrue(validate_ownership(self.user1, self.planning_area1))

    def test_validate_ownership_different_user(self):
        self.assertFalse(validate_ownership(self.user1, self.planning_area2))

    def test_validate_ownership_non_planning_area_instance(self):
        self.assertFalse(validate_ownership(self.user1, self.user2))


class TestGetPermissions(TransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create(username="foo", email="foo@foo.com")
        self.user2 = User.objects.create(username="bar", email="bar@bar.com")
        self.user3 = User.objects.create(
            username="INVITER", email="i-invite-you@bar.com"
        )
        self.planning_area1 = PlanningArea.objects.create(
            user=self.user1, region_name="a"
        )
        self.planning_area2 = PlanningArea.objects.create(
            user=self.user2, region_name="b"
        )
        self.content_type = ContentType.objects.get_for_model(PlanningArea)
        self.user_object_role1 = UserObjectRole.objects.create(
            inviter=self.user3,
            collaborator=self.user1,
            content_type=self.content_type,
            object_pk=self.planning_area1.pk,
            role=Role.OWNER,
        )
        self.user_object_role2 = UserObjectRole.objects.create(
            inviter=self.user3,
            collaborator=self.user1,
            content_type=self.content_type,
            object_pk=self.planning_area2.pk,
            role=Role.VIEWER,
        )

    def test_get_permissions_owner(self):
        permissions = get_permissions(self.user1, self.planning_area1)
        self.assertGreater(7, len(permissions))

    def test_get_permissions_not_owner_no_role(self):
        permissions = get_permissions(self.user1, self.planning_area2)
        self.assertGreaterEqual(len(permissions), 2)
        self.assertIn("view_planningarea", permissions)
        self.assertIn("view_scenario", permissions)


class TestLinkInvites(TransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create(username="foo", email="foo@foo.com")

        self.planning_area1 = PlanningArea.objects.create(
            user=self.user1, region_name="a"
        )
        self.planning_area2 = PlanningArea.objects.create(
            user=self.user1, region_name="b"
        )
        self.content_type = ContentType.objects.get_for_model(PlanningArea)
        self.user_object_role1 = UserObjectRole.objects.create(
            inviter=self.user1,
            email="bar@bar.com",
            content_type=self.content_type,
            object_pk=self.planning_area1.pk,
            role=Role.OWNER,
        )
        self.user_object_role2 = UserObjectRole.objects.create(
            inviter=self.user1,
            email="bar@bar.com",
            content_type=self.content_type,
            object_pk=self.planning_area2.pk,
            role=Role.VIEWER,
        )

    def test_link_invites_updates_userobjectrole(self):
        user = User.objects.create(username="bar", email="Bar@Bar.com")
        invites = link_invites(user)
        self.assertEqual(len(invites), 2)
