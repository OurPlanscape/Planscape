from collaboration.models import Role, UserObjectRole
from collaboration.services import get_content_type
from datasets.tests.factories import DataLayerFactory
from django.db.utils import IntegrityError
from django.test import TestCase

from planning.models import PlanningArea, RegionChoices, ScenarioType, ScenarioStatus
from datasets.models import DataLayerType
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
        PlanningAreaFactory(
            name="foo", region_name=RegionChoices.SIERRA_NEVADA, user=user
        )

        with self.assertRaises(IntegrityError):
            PlanningArea.objects.create(
                user=user, name="foo", region_name=RegionChoices.SIERRA_NEVADA
            )

    def test_use_name_of_a_deleted_planning_area(self):
        try:
            user = UserFactory()
            deleted_planning_area = PlanningAreaFactory(
                name="foo", region_name=RegionChoices.SIERRA_NEVADA, user=user
            )
            deleted_planning_area.delete()

            PlanningArea.objects.create(
                user=user, name="foo", region_name=RegionChoices.SIERRA_NEVADA
            )
        except Exception as e:
            self.fail(f"Test failed {e}.")

    def test_list_by_user_excludes_deleted_and_archived_scenarios(self):
        user = UserFactory()
        planning_area = PlanningAreaFactory(user=user)

        scenarios = ScenarioFactory.create_batch(size=5, planning_area=planning_area)
        planning_area.scenario_count = 5
        planning_area.save(update_fields=["updated_at", "scenario_count"])

        planning_areas = PlanningArea.objects.list_for_api(user)

        self.assertEqual(planning_areas.first().scenario_count, 5)

        scenarios[0].delete()
        scenarios[1].status = ScenarioStatus.ARCHIVED
        scenarios[1].save()
        planning_areas = PlanningArea.objects.list_for_api(user)
        planning_area.scenario_count = 3
        planning_area.save(update_fields=["updated_at", "scenario_count"])
        self.assertEqual(planning_areas.first().scenario_count, 3)

    def test_list_by_user_does_not_duplicate_areas(self):
        user1 = UserFactory()
        user2 = UserFactory()
        _ = PlanningAreaFactory(user=user1)
        planning_area2 = PlanningAreaFactory(user=user2)
        content_type = get_content_type("planningarea")
        _ = UserObjectRole.objects.create(
            inviter=user2,
            email=user1.email,
            content_type=content_type,
            role=Role.OWNER,
            object_pk=planning_area2.pk,
            collaborator=user1,
        )

        planning_areas = PlanningArea.objects.list_for_api(user1)
        self.assertEqual(planning_areas.count(), 2)


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


class ScenarioModelTest(TestCase):
    def setUp(self):
        self.datalayers = DataLayerFactory.create_batch(size=5, type=DataLayerType.RASTER)
        self.treatment_goal = TreatmentGoalFactory.create(datalayers=self.datalayers)

    def test_get_raster_datalayers_preset_scenario(self):
        scenario = ScenarioFactory(
            type=ScenarioType.PRESET, 
            treatment_goal=self.treatment_goal
        )
        datalayers = scenario.get_raster_datalayers()
        self.assertEqual(len(datalayers), 5)

    def test_get_raster_datalayers_custom_scenario(self):
        scenario = ScenarioFactory(
            type=ScenarioType.CUSTOM, 
            with_priority_objectives=self.datalayers[:2], 
            with_cobenefits=self.datalayers[2:]
        )
        datalayers = scenario.get_raster_datalayers()
        self.assertEqual(len(datalayers), 5)