from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TestCase, TransactionTestCase

from planning.services import (
    get_max_treatable_area,
    get_max_treatable_stand_count,
    validate_scenario_treatment_ratio,
)
from planning.models import PlanningArea
from stands.models import Stand, StandSizeChoices


class MaxTreatableAreaTest(TestCase):
    def test_get_max_treat_area_returns_budget_per_acre(self):
        conf = {"max_budget": 1000, "est_cost": 10}
        max_treat = get_max_treatable_area(conf)
        self.assertEqual(100, max_treat)

    def test_get_max_treat_area_returns_max_treatment_ratio(self):
        conf = {"max_budget": None, "est_cost": 10, "max_treatment_area_ratio": 100}
        max_treat = get_max_treatable_area(conf)
        self.assertEqual(100, max_treat)

    def test_get_max_treat_area_returns_max_treatment_ratio_missing_key(self):
        conf = {"est_cost": 10, "max_treatment_area_ratio": 100}
        max_treat = get_max_treatable_area(conf)
        self.assertEqual(100, max_treat)

    def test_get_max_treatable_stand_count(self):
        max_area = 1000
        stand_size = StandSizeChoices.LARGE
        stand_count = get_max_treatable_stand_count(max_area, stand_size)
        self.assertEqual(2, stand_count)


class ValidateScenarioTreatmentRatio(TransactionTestCase):
    def test_validate_scenario_between_20_and_80(self):
        unit_poly = GEOSGeometry("POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))", srid=4269)
        planning_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([unit_poly]),
        )
        for i in range(1, 10):
            Stand.objects.create(
                size=StandSizeChoices.LARGE,
                geometry=unit_poly,
                area_m2=1,
            )
        conf = {
            "max_budget": None,
            "est_cost": 10,
            # 4 stands
            "max_treatment_area_ratio": 2000,
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(planning_area, conf)
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    def test_validate_scenario_false_below_20(self):
        unit_poly = GEOSGeometry("POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))", srid=4269)
        planning_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([unit_poly]),
        )
        for i in range(1, 10):
            Stand.objects.create(
                size=StandSizeChoices.LARGE,
                geometry=unit_poly,
                area_m2=1,
            )
        conf = {
            "max_budget": None,
            "est_cost": 10,
            # 1 stand
            "max_treatment_area_ratio": 500,
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(planning_area, conf)
        self.assertFalse(result)
        self.assertEqual(
            "Too few treatable stands for the selected area and stand size.", reason
        )

    def test_validate_scenario_false_above_80(self):
        unit_poly = GEOSGeometry("POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))", srid=4269)
        planning_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([unit_poly]),
        )
        for i in range(1, 10):
            Stand.objects.create(
                size=StandSizeChoices.LARGE,
                geometry=unit_poly,
                area_m2=1,
            )
        conf = {
            "max_budget": None,
            "est_cost": 10,
            # 9 stands
            "max_treatment_area_ratio": 4500,
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(planning_area, conf)
        self.assertFalse(result)
        self.assertEqual(
            "Too many treatable stands for the selected area and stand size.", reason
        )
