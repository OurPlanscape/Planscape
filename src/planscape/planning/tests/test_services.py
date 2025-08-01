import shutil
from datetime import date, datetime

import csv
import fiona
import json
import shapely
from unittest import mock
from cacheops import invalidate_all
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
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
    export_to_geopackage,
    get_max_treatable_area,
    get_max_treatable_stand_count,
    get_schema,
    planning_area_covers,
    validate_scenario_treatment_ratio,
    get_acreage,
)
from planning.tests.factories import (
    PlanningAreaFactory,
    ScenarioFactory,
    ProjectAreaFactory,
    ScenarioResultFactory,
)
from planscape.tests.factories import UserFactory
from stands.tests.factories import StandFactory


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
        # Test Polygon is 12165389.42118729 spherical acres

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

    # 20% of spherical acreage is 2433077.8
    def test_validate_acres_just_above_20pct(self):
        conf_just_above_20 = self.get_basic_conf()
        conf_just_above_20["max_treatment_area_ratio"] = 2433078
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

    # 80% of spherical acreage is 9732311.536949832
    def test_validate_acres_just_below_80pct(self):
        conf_just_below_80 = self.get_basic_conf()
        conf_just_below_80["max_treatment_area_ratio"] = 9732311
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_just_below_80
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    def test_validate_acres_just_above_80pct(self):
        conf_acres_above_80 = self.get_basic_conf()
        conf_acres_above_80["max_treatment_area_ratio"] = 9732312
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_acres_above_80
        )
        self.assertFalse(result)
        self.assertIn("less than", reason)
        self.assertIn("80%", reason)

    # 20% of spherical acreage is 2433077.8
    #   at 2470/acre, this would require: $6,009,702,166
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
        conf_budget_above_20pct["max_budget"] = 6009802166
        result, reason = validate_scenario_treatment_ratio(
            self.test_area, conf_budget_above_20pct
        )
        self.assertTrue(result)
        self.assertEqual("Treatment ratio is valid.", reason)

    # 99% of acreage is 12043735.526975417*
    #  so, at cost of 2470/acre, this requires $ 29748026751.63
    def test_validate_budget_above_99pct(self):
        conf_budget_above_99 = self.get_basic_conf()
        conf_budget_above_99["max_budget"] = 29749026751
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


class TestExportToGeopackage(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        self.stand = StandFactory.create()
        self.planning = PlanningAreaFactory.create(
            name="foo",
            region_name="sierra-nevada",
            geometry=self.unit_poly,
            user=self.user,
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning, name="s1", user=self.user
        )
        data = {
            "foo": "abc",
            "bar": 1,
            "baz": 1.2,
            "now": str(datetime.now()),
            "today": date.today(),
        }
        ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=self.unit_poly,
            data=data,
            created_by=self.user,
            name="foo",
        )
        ScenarioResultFactory.create(
            scenario=self.scenario, status=ScenarioResultStatus.SUCCESS
        )

        forsys_folder = self.scenario.get_forsys_folder()
        if not forsys_folder.exists():
            forsys_folder.mkdir(parents=True, exist_ok=True)
        self.inputs_file = forsys_folder / "inputs.csv"

        inputs_data_rows = [
            [
                "WKT",
                "stand_id",
                "area_acres",
                "datalayer_1",
                "datalayer_2",
                "datalayer_3",
                "datalayer_4",
                "datalayer_5",
                "datalayer_6_SPM",
                "datalayer_7_PCP",
                "priority",
            ],
            [
                "POLYGON ((-2226358.53928425 1950498.20568641,-2225919.84794646 1949738.37000051,-2225042.46527088 1949738.37000052,-2224603.77393309 1950498.20568641,-2225042.46527088 1951258.0413723,-2225919.84794646 1951258.0413723,-2226358.53928425 1950498.20568641))",
                self.stand.pk,
                494.193231034226,
                73,
                0,
                38.9199636198272,
                0,
                0,
                0,
                -0,
                0,
            ],
        ]
        with open(self.inputs_file, "w") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(inputs_data_rows)

        stnd_data_rows = [
            [
                "stand_id",
                "proj_id",
                "DoTreat",
                "selected",
                "ETrt_YR",
                "area_acres",
                "datalayer_1",
                "datalayer_2",
                "datalayer_3",
                "datalayer_4",
                "weightedPriority",
                "Pr_1_priority",
            ],
            [
                self.stand.pk,
                1,
                1,
                1,
                1,
                494.193231036229,
                0.136334928019663,
                10.27318640955,
                7882.24269662921,
                0,
                16.6071320953935,
                1,
            ],
        ]

        forsys_folder = self.scenario.get_forsys_folder()
        self.outputs_file = forsys_folder / f"stnd_{self.scenario.uuid}.csv"
        with open(self.outputs_file, "w") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(stnd_data_rows)

    @mock.patch(
        "planning.services.create_upload_url",
        return_value={"url": "http://example.com/upload"},
    )
    @mock.patch("planning.services.upload_file_via_api", autospec=True)
    def test_export_geopackage(self, upload_mock, create_url_mock):
        invalidate_all()
        output = export_to_geopackage(self.scenario)
        self.assertIsNotNone(output)
        self.assertTrue(output.endswith(".gpkg.zip"))
        self.assertTrue(create_url_mock.called)
        self.assertTrue(upload_mock.called)

    @mock.patch(
        "planning.services.create_upload_url",
        return_value={"url": "http://example.com/upload"},
    )
    @mock.patch("planning.services.upload_file_via_api", autospec=True)
    def test_export_geopackage_already_existing(self, upload_mock, create_url_mock):
        invalidate_all()
        self.scenario.geopackage_url = "gs://test-bucket/test-folder/test.gpkg.zip"
        self.scenario.save(update_fields=["geopackage_url"])

        output = export_to_geopackage(self.scenario)
        self.assertIsNotNone(output)
        self.assertEqual(self.scenario.geopackage_url, output)
        self.assertFalse(create_url_mock.called)
        self.assertFalse(upload_mock.called)


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


# compare with known turf.js results
class TestAcreageCalculation(TestCase):
    def setUp(self):
        self.ohare = """{ "type": "Feature",
                        "properties": {},
                        "geometry": {
                            "type": "MultiPolygon",
                            "coordinates": [[[[-87.935169366,41.961504895],
                                                [-87.92028533,41.951378337],
                                                [-87.907934746,41.948080971],
                                                [-87.890200575,41.949494149],
                                                [-87.877216628,41.967156227],
                                                [-87.873416449,41.988108876],
                                                [-87.885450351,42.006936833],
                                                [-87.909834836,42.015172313],
                                                [-87.926302281,42.009289936],
                                                [-87.939602909,41.994934654],
                                                [-87.938336183,41.973513377],
                                                [-87.935169366,41.961504895]]]]}}"""

        self.shasta = """{"type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "MultiPolygon",
                                "coordinates": [[[[-122.506372297,41.455991654],
                                                [-123.066191627,41.632675159],
                                                [-123.592286901,41.560377431],
                                                [-123.844093185,41.140131886],
                                                [-123.738424477,40.454235364],
                                                [-122.994246974,40.281226116],
                                                [-122.025242431,40.553386397],
                                                [-121.645284734,40.880564151],
                                                [-121.944304697,41.250096143],
                                                [-122.506372297,41.455991654]]]]}}"""

        self.ca_shape = """ {"type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "MultiPolygon",
                                "coordinates": [[[[-119.274539018,36.303191789],
                                                [-120.345934319,35.860912955],
                                                [-118.973931704,35.359597814],
                                                [-118.133772799,36.09793504],
                                                [-119.274539018,36.303191789]]]]}}"""

    def test_get_acreage_ohare(self):
        expected_ohare_acres = 7722.191460915323
        geom_dict = json.loads(self.ohare)["geometry"]
        ohare_geometry = GEOSGeometry(json.dumps(geom_dict))
        tolerance_delta = abs(expected_ohare_acres * 0.001)
        self.assertAlmostEqual(
            get_acreage(ohare_geometry), expected_ohare_acres, delta=tolerance_delta
        )

    def test_get_acreage_shasta(self):
        expected_shasta_acres = 4820350.111878374
        geom_dict = json.loads(self.shasta)["geometry"]
        shasta_geom = GEOSGeometry(json.dumps(geom_dict))
        tolerance_delta = abs(expected_shasta_acres * 0.001)
        self.assertAlmostEqual(
            get_acreage(shasta_geom), expected_shasta_acres, delta=tolerance_delta
        )

    def test_ca_shape(self):
        expected_ca_acres = 2669323.5845463574
        geom_dict = json.loads(self.ca_shape)["geometry"]
        ca_geom = GEOSGeometry(json.dumps(geom_dict))
        tolerance_delta = abs(expected_ca_acres * 0.001)
        self.assertAlmostEqual(
            get_acreage(ca_geom), expected_ca_acres, delta=tolerance_delta
        )
