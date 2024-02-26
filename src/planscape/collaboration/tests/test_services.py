from django.test import TestCase, TransactionTestCase
from collaboration.services import validate_ownership
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
