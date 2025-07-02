import shutil
from datetime import date, datetime

import fiona
import json
import shapely
from shapely.geometry import shape
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.test import TestCase, TransactionTestCase
from fiona.crs import to_string
from stands.models import StandSizeChoices

from planning.models import (
    PlanningArea,
    ProjectArea,
    Scenario,
    ScenarioResult,
    ScenarioResultStatus,
)
from planning.services import (
    export_to_shapefile,
    get_max_treatable_area,
    get_max_treatable_stand_count,
    get_schema,
    planning_area_covers,
    validate_scenario_treatment_ratio,
    get_spherical_acreage,
    get_acreage
)
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


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
    def setUp(self) -> None:
        # Note: Test Polygon is 12163249.414195888 acres
        self.test_poly = GEOSGeometry("POLYGON ((0 0, 0 2, 2 2, 2 0, 0 0))", srid=4269)
        self.test_area = PlanningArea.objects.create(
            region_name="sierra-nevada",
            name="mytest",
            geometry=MultiPolygon([self.test_poly]),
        )

    def get_basic_conf(self):
        return {
            "est_cost": 2470,
            "min_distance_from_road": None,
            "max_slope": None,
            "global_thresholds": [],
            "weights": [],
            "excluded_areas": [],
            "stand_size": StandSizeChoices.LARGE,
        }

    # 20% of acreage should be 2432649.882839178
    def test_validate_acres_just_above_20pct(self):
        conf_just_above_20 = self.get_basic_conf()
        conf_just_above_20["max_treatment_area_ratio"] = 2432650
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_just_above_20
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    def test_validate_acres_just_below_20pct(self):
        conf_acres_below_20pct = self.get_basic_conf()
        conf_acres_below_20pct["max_treatment_area_ratio"] = 2432640
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_acres_below_20pct
        )
        self.assertFalse(result)
        self.assertIn("at least", reason)

    # 80% of area is 9730599.531356712
    def test_validate_acres_just_below_80pct(self):
        conf_just_below_80 = self.get_basic_conf()
        conf_just_below_80["max_treatment_area_ratio"] = 9730590
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_just_below_80
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    def test_validate_acres_just_above_80pct(self):
        conf_acres_above_80 = self.get_basic_conf()
        conf_acres_above_80["max_treatment_area_ratio"] = 9730600
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_acres_above_80
        )
        self.assertFalse(result)
        self.assertIn("less than", reason)
        self.assertIn("80%", reason)

    # 20% of acreage should be 2432649.882839178
    #  so, with cost of 2470/acre, this requires $ 6,008,645,200.61
    def test_validate_budget_below_20pct(self):
        conf_budget_below_20pct = self.get_basic_conf()
        conf_budget_below_20pct["max_budget"] = 6008641030
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_budget_below_20pct
        )
        self.assertFalse(result)
        self.assertIn("at least", reason)

    def test_validate_budget_above_20pct(self):
        conf_budget_above_20pct = self.get_basic_conf()
        conf_budget_above_20pct["max_budget"] = 6008645211
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_budget_above_20pct
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    # 99% of acreage should be 12041616.9200539311
    #  so, at cost of 2470/acre, this requires $ 29,742,793,792.53
    def test_validate_budget_above_99pct(self):
        conf_budget_above_99 = self.get_basic_conf()
        conf_budget_above_99["max_budget"] = 29742793793
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_budget_above_99
        )
        self.assertTrue(result)
        self.assertIn("Treatment ratio is valid.", reason)


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
        user = UserFactory.create()
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningArea.objects.create(
            name="foo",
            region_name="sierra-nevada",
            geometry=unit_poly,
            user=user,
        )
        scenario = Scenario.objects.create(
            planning_area=planning,
            name="s1",
            user=user,
        )
        data = {
            "foo": "abc",
            "bar": 1,
            "baz": 1.2,
            "now": str(datetime.now()),
            "today": date.today(),
        }
        ProjectArea.objects.create(
            scenario=scenario,
            geometry=unit_poly,
            data=data,
            created_by=user,
            name="foo",
        )
        ScenarioResult.objects.create(
            scenario=scenario, status=ScenarioResultStatus.SUCCESS
        )

        output = export_to_shapefile(scenario)
        self.assertIsNotNone(output)
        path = output / "s1.shp"
        with fiona.open(path, "r", "ESRI Shapefile") as source:
            self.assertEqual(1, len(source))
            self.assertEqual(to_string(source.crs), "EPSG:4269")
            shutil.rmtree(str(output))


class TestPlanningAreaCovers(TestCase):
    def setUp(self):
        self.real_world_geom = "MULTIPOLYGON (((-120.592804 40.388397, -120.653229 40.089629, -121.098175 40.043386, -121.308289 40.179923, -121.059723 40.687928, -120.433502 41.088667, -120.013275 41.096947, -120.009155 40.701464, -120.010529 39.949753, -120.592804 40.388397)))"
        self.real_world_planning_area = PlanningAreaFactory.create(
            geometry=GEOSGeometry(self.real_world_geom, srid=4269)
        )
        self.covers_de9im = GEOSGeometry(
            "POLYGON ((-121.13497533859726 40.378055548860004, -120.5974285753569 40.45918503498109, -120.0351560371661 40.02304123541387, -120.0295412055665 41.05622374781322, -120.40813814721828 41.0493352414621, -120.99739165146956 40.63587551109521, -121.13497533859726 40.378055548860004))",
            srid=4269,
        )
        # in this is not necessary to create the stands, they are present by the usage of a migration
        # that autoloads the LARGE stands.

    def test_real_world(self):
        with fiona.open(
            "planning/tests/test_data/project_areas_for_pa_covers.shp"
        ) as shapefile:
            features = [f for f in shapefile]
            # this convoluted conversion step is because Django automatically
            # considers geometries coming FROM geojson to be 4326
            geometries = [shapely.geometry.shape(f.geometry) for f in features]
            geometries = MultiPolygon(
                [GEOSGeometry(g.wkt, srid=4269) for g in geometries], srid=4269
            )
            test_geometry = geometries.unary_union
        self.assertTrue(
            planning_area_covers(
                self.real_world_planning_area,
                test_geometry,
                stand_size=StandSizeChoices.LARGE,
            )
        )

    def test_de9im_covers(self):
        self.assertTrue(
            planning_area_covers(
                self.real_world_planning_area,
                self.covers_de9im,
                stand_size=StandSizeChoices.LARGE,
            )
        )

class TestAcreageCalculation(TestCase):
    def setUp(self):
        # 2.47 acres
        self.chicago_block = Polygon([
                (-87.627834, 41.880834),  # SW corner
                (-87.626834, 41.880834),  # SE corner  
                (-87.626834, 41.881834),  # NE corner
                (-87.627834, 41.881834),  # NW corner
                (-87.627834, 41.880834)   # Close polygon
            ], srid=4326)
        
            # 776,957 acres
        self.rhode_island_approx = Polygon([
                (-71.862, 41.146),   # SW corner (Westerly area)
                (-71.120, 41.146),   # SE corner (coast near CT border)
                (-71.120, 41.240),   # East coast (Narragansett Bay entrance)
                (-71.200, 41.350),   # Newport area
                (-71.320, 41.500),   # East Bay
                (-71.422, 41.820),   # Providence area
                (-71.580, 41.900),   # North Providence
                (-71.700, 41.950),   # Northern border
                (-71.862, 41.780),   # Western border (Connecticut River area)
                (-71.862, 41.500),   # Block Island Sound coastline
                (-71.862, 41.146)    # Close
            ], srid=4326)
            
    # Lake Tahoe approximation (known area: ~122,000 acres water surface)
        self.lake_tahoe_approx = Polygon([
                (-120.097, 39.089),  # South shore
                (-120.024, 39.089),  # SE corner
                (-120.024, 39.200),  # East shore
                (-120.000, 39.270),  # NE area
                (-120.097, 39.270),  # North shore
                (-120.170, 39.240),  # NW area  
                (-120.097, 39.200),  # West shore
                (-120.097, 39.089)   # Close
            ], srid=4326)
        
        # Known acreage is 77941.31056524477
        self.known_CA_shape = '{"type": "Feature", "properties": {}, "geometry": {"type": "MultiPolygon", "coordinates": [[[[ -118.299924978, 34.037354049], [-118.30058541, 33.885621511], [-118.10641835, 33.86697866], [-118.10641835, 34.008890602], [-118.244448675, 34.052129382], [-118.299924978, 34.037354049]]]]}}'
        
        # Spherical acreage is 373133.46345923113
        self.around_LA_shape = '''{
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "MultiPolygon",
                                        "coordinates": [[
                                            [
                                                [-118.529094944, 34.117219603],
                                                [-118.467014319, 34.001773248],
                                                [-118.377195543, 33.852171143],
                                                [-118.195576694, 33.841200956],
                                                [-118.017920438, 33.902615854],
                                                [-117.920176475, 34.009438066],
                                                [-117.939989441, 34.126514121],
                                                [-118.251052997, 34.164228438],
                                                [-118.421444499, 34.1609496],
                                                [-118.529094944, 34.117219603]
                                            ]
                                        ]]
                                    }
                                }'''
        
    def test_get_spherical_acreage(self): 
        la_geometry = shape(json.loads(self.around_LA_shape)['geometry'])

        self.assertEquals(
            get_spherical_acreage(la_geometry), 373133.46345923113
        )
        # self.assertEquals(
        #     get_spherical_acreage(self.rhode_island_approx), 100000
        # )
        # self.assertEquals(
        #     get_spherical_acreage(self.lake_tahoe_approx), 100000
        # )

