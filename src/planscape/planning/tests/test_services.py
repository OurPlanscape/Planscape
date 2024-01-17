from datetime import date, datetime
import shutil
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TestCase, TransactionTestCase
import fiona
from fiona.crs import to_string

from planning.services import (
    export_to_shapefile,
    get_max_treatable_area,
    get_max_treatable_stand_count,
    get_schema,
    validate_scenario_treatment_ratio,
)
from planning.models import PlanningArea, Scenario, ScenarioResult, ScenarioResultStatus
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


class ValidateScenarioTreatmentRatioTest(TransactionTestCase):
    def test_validate_scenario_between_20_and_80(self):
        unit_poly = GEOSGeometry("POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))", srid=4269)
        planning_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([unit_poly]),
        )
        conf_just_above_20 = {
            "est_cost": 2470,
            "max_budget": 1502470420,
            "min_distance_from_road": None,
            "max_slope": None,
            "global_thresholds": [],
            "weights": [],
            "excluded_areas": [],
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(
            planning_area, conf_just_above_20
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

        conf_just_below_80 = {
            "est_cost": 2470,
            "max_budget": 6009867880,
            "min_distance_from_road": None,
            "max_slope": None,
            "global_thresholds": [],
            "weights": [],
            "excluded_areas": [],
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(
            planning_area, conf_just_below_80
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    def test_validate_scenario_false_below_20(self):
        unit_poly = GEOSGeometry("POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))", srid=4269)
        planning_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([unit_poly]),
        )

        # This will be be less than 2433144 acres
        conf = {
            "est_cost": 2470,
            "max_budget": 1200,
            "min_distance_from_road": None,
            "max_slope": None,
            "global_thresholds": [],
            "weights": [],
            "excluded_areas": [],
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(planning_area, conf)
        self.assertFalse(result)
        self.assertIn("at least", reason)

    def test_validate_scenario_false_above_80(self):
        unit_poly = GEOSGeometry("POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))", srid=4269)
        planning_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([unit_poly]),
        )

        # This will be more than 2433144 acres
        conf = {
            "est_cost": 2470,
            "max_budget": 8009867656,
            "min_distance_from_road": None,
            "max_slope": None,
            "global_thresholds": [],
            "weights": [],
            "excluded_areas": [],
            "stand_size": StandSizeChoices.LARGE,
        }
        result, reason = validate_scenario_treatment_ratio(planning_area, conf)
        self.assertFalse(result)
        self.assertIn("less than", reason)


class GetSchemaTest(TestCase):
    def test_get_schema_returns_first_feature(self):
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "properties": {
                        "foo": "abc",
                        "bar": 1,
                        "baz": 1.2,
                        "now": datetime.now(),
                        "today": date.today(),
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
                    },
                }
            ],
        }
        schema = get_schema(geojson)
        self.assertIsNotNone(schema)
        self.assertIn("geometry", schema)
        self.assertIn("properties", schema)
        self.assertEqual(5, len(schema["properties"]))


class ExportToShapefileTest(TransactionTestCase):
    def test_export_raises_value_error_failure(self):
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningArea.objects.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = Scenario.objects.create(planning_area=planning, name="s1")
        _ = ScenarioResult.objects.create(
            scenario=scenario, status=ScenarioResultStatus.FAILURE
        )
        with self.assertRaises(ValueError):
            export_to_shapefile(scenario)

    def test_export_raises_value_error_pending(self):
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningArea.objects.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = Scenario.objects.create(planning_area=planning, name="s1")
        _ = ScenarioResult.objects.create(
            scenario=scenario, status=ScenarioResultStatus.PENDING
        )
        with self.assertRaises(ValueError):
            export_to_shapefile(scenario)

    def test_export_raises_value_error_running(self):
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningArea.objects.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = Scenario.objects.create(planning_area=planning, name="s1")
        _ = ScenarioResult.objects.create(
            scenario=scenario, status=ScenarioResultStatus.RUNNING
        )
        with self.assertRaises(ValueError):
            export_to_shapefile(scenario)

    def test_export_creates_file(self):
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningArea.objects.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = Scenario.objects.create(planning_area=planning, name="s1")
        result = ScenarioResult.objects.create(
            scenario=scenario,
            status=ScenarioResultStatus.SUCCESS,
            result={
                "type": "FeatureCollection",
                "features": [
                    {
                        "properties": {
                            "foo": "abc",
                            "bar": 1,
                            "baz": 1.2,
                            "now": str(datetime.now()),
                            "today": date.today(),
                        },
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
                        },
                    }
                ],
            },
        )
        output = export_to_shapefile(scenario)
        self.assertIsNotNone(output)
        path = output / "s1.shp"
        with fiona.open(path, "r", "ESRI Shapefile") as source:
            self.assertEqual(1, len(source))
            self.assertEqual(to_string(source.crs), "EPSG:4326")
            shutil.rmtree(str(output))
