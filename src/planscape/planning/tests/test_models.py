from django.test import TestCase
from django.db.utils import IntegrityError
from planning.models import PlanningArea, RegionChoices
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class PlanningAreaModelTest(TestCase):
    def test_cannot_create_two_planning_areas_with_same_name(self):
        user = UserFactory()
        original_planning_area = PlanningAreaFactory(
            name="foo", region_name=RegionChoices.SIERRA_NEVADA, user=user
        )

        with self.assertRaises(IntegrityError):
            duplicated_planning_area = PlanningArea.objects.create(
                user=user, name="foo", region_name=RegionChoices.SIERRA_NEVADA
            )

    def test_use_name_of_a_deleted_planning_area(self):
        try:
            user = UserFactory()
            deleted_planning_area = PlanningAreaFactory(
                name="foo", region_name=RegionChoices.SIERRA_NEVADA, user=user
            )
            deleted_planning_area.delete()

            second_planning_area = PlanningArea.objects.create(
                user=user, name="foo", region_name=RegionChoices.SIERRA_NEVADA
            )
        except Exception as e:
            self.fail(f"Test failed {e}.")
