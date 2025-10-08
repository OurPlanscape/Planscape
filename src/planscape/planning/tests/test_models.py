from django.db.utils import IntegrityError
from django.test import TestCase

from datasets.tests.factories import DataLayerFactory
from planning.models import PlanningArea, RegionChoices
from planning.tests.factories import (
    PlanningAreaFactory,
    ScenarioFactory,
    TreatmentGoalFactory,
    TreatmentGoalUsesDataLayerFactory,
)
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

    def test_list_by_user_excludes_deleted_scenarios(self):
        user = UserFactory()
        planning_area = PlanningAreaFactory(user=user)

        scenarios = ScenarioFactory.create_batch(size=5, planning_area=planning_area)

        planning_areas = PlanningArea.objects.list_for_api(user)

        self.assertEqual(planning_areas.first().scenario_count, 5)

        scenarios[0].delete()
        planning_areas = PlanningArea.objects.list_for_api(user)

        self.assertEqual(planning_areas.first().scenario_count, 4)


class TreatmentGoalUsesDataLayerTest(TestCase):
    def test_treatment_goal_with_datalayers(self):
        tx_goal = TreatmentGoalFactory.create()
        for _ in range(5):
            datalayer = DataLayerFactory.create()
            TreatmentGoalUsesDataLayerFactory.create(
                treatment_goal=tx_goal, datalayer=datalayer
            )

        tx_goal.refresh_from_db()

        self.assertEqual(tx_goal.datalayers.count(), 5)
        self.assertEqual(tx_goal.active_datalayers.count(), 5)

    def test_treatment_goal_with_datalayers_soft_deleted(self):
        tx_goal = TreatmentGoalFactory.create()
        for _ in range(5):
            datalayer = DataLayerFactory.create()
            tgudl = TreatmentGoalUsesDataLayerFactory.create(
                treatment_goal=tx_goal, datalayer=datalayer
            )
            tgudl.delete()

        tx_goal.refresh_from_db()

        self.assertEqual(tx_goal.datalayers.count(), 5)
        self.assertEqual(tx_goal.active_datalayers.count(), 0)
