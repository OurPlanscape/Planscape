import csv
import json
import shutil
from datetime import date, datetime
from pathlib import Path
from unittest import mock

import fiona
import shapely
from cacheops import invalidate_all
from datasets.dynamic_models import qualify_for_django
from datasets.models import DataLayerType, GeometryType
from datasets.tasks import datalayer_uploaded
from datasets.tests.factories import DataLayerFactory
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.db import connection
from django.test import TestCase, TransactionTestCase
from fiona.crs import to_string
from stands.models import Stand, StandSizeChoices
from stands.services import calculate_stand_vector_stats3
from stands.tests.factories import StandFactory

from planning.models import PlanningArea, ScenarioResultStatus
from planning.services import (
    export_planning_area_to_geopackage,
    export_to_geopackage,
    export_to_shapefile,
    get_acreage,
    get_constrained_stands,
    get_max_treatable_area,
    get_max_treatable_stand_count,
    get_schema,
    planning_area_covers,
    validate_scenario_treatment_ratio,
)
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
    ScenarioResultFactory,
    TreatmentGoalFactory,
)
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
        planning = PlanningAreaFactory.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = ScenarioFactory.create(planning_area=planning, name="s1")
        _ = ScenarioResultFactory.create(
            scenario=scenario, status=ScenarioResultStatus.FAILURE
        )
        with self.assertRaises(ValueError):
            export_to_shapefile(scenario)

    def test_export_raises_value_error_pending(self):
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningAreaFactory.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = ScenarioFactory.create(planning_area=planning, name="s1")
        _ = ScenarioResultFactory.create(
            scenario=scenario, status=ScenarioResultStatus.PENDING
        )
        with self.assertRaises(ValueError):
            export_to_shapefile(scenario)

    def test_export_raises_value_error_running(self):
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningAreaFactory.create(
            name="foo", region_name="sierra-nevada", geometry=unit_poly
        )
        scenario = ScenarioFactory.create(planning_area=planning, name="s1")
        _ = ScenarioResultFactory.create(
            scenario=scenario, status=ScenarioResultStatus.RUNNING
        )
        with self.assertRaises(ValueError):
            export_to_shapefile(scenario)

    def test_export_creates_file(self):
        user = UserFactory.create()
        unit_poly = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)))", srid=4269
        )
        planning = PlanningAreaFactory.create(
            name="foo",
            region_name="sierra-nevada",
            geometry=unit_poly,
            user=user,
        )
        scenario = ScenarioFactory.create(
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
        ProjectAreaFactory.create(
            scenario=scenario,
            geometry=unit_poly,
            data=data,
            created_by=user,
            name="foo",
        )
        ScenarioResultFactory.create(
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
        self.datalayers = DataLayerFactory.create_batch(7)
        self.stand = StandFactory.create()
        self.planning = PlanningAreaFactory.create(
            name="foo",
            region_name="sierra-nevada",
            geometry=self.unit_poly,
            user=self.user,
        )
        self.treatment_goal = TreatmentGoalFactory.create(
            name="Test Goal",
            datalayers=self.datalayers,
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning,
            name="s1",
            user=self.user,
            treatment_goal=self.treatment_goal,
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
                f"datalayer_{self.datalayers[0].pk}",
                f"datalayer_{self.datalayers[1].pk}",
                f"datalayer_{self.datalayers[2].pk}",
                f"datalayer_{self.datalayers[3].pk}",
                f"datalayer_{self.datalayers[4].pk}",
                f"datalayer_{self.datalayers[5].pk}_SPM",
                f"datalayer_{self.datalayers[6].pk}_PCP",
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
                f"datalayer_{self.datalayers[0].pk}",
                f"datalayer_{self.datalayers[1].pk}",
                f"datalayer_{self.datalayers[2].pk}",
                f"datalayer_{self.datalayers[3].pk}",
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

        self.output_path = Path("test_planning_area.gpkg")

    @mock.patch("planning.services.upload_file_via_cli", autospec=True)
    def test_export_geopackage(self, upload_mock):
        invalidate_all()
        output = export_to_geopackage(self.scenario)
        self.assertIsNotNone(output)
        self.assertTrue(output.endswith(".gpkg.zip"))
        self.assertTrue(upload_mock.called)

    @mock.patch("planning.services.upload_file_via_cli", autospec=True)
    def test_export_geopackage_already_existing(self, upload_mock):
        invalidate_all()
        self.scenario.geopackage_url = "gs://test-bucket/test-folder/test.gpkg.zip"
        self.scenario.save(update_fields=["geopackage_url"])

        output = export_to_geopackage(self.scenario)
        self.assertIsNotNone(output)
        self.assertEqual(self.scenario.geopackage_url, output)
        self.assertFalse(upload_mock.called)

    def test_export_planning_area_to_geopackage(self):
        export_planning_area_to_geopackage(self.planning, self.output_path)
        layers = fiona.listlayers(self.output_path)
        self.assertIn("planning_area", layers)
        with fiona.open(self.output_path, layer="planning_area") as src:
            self.assertEqual(1, len(src))
            self.assertEqual(
                to_string(src.crs), to_string(settings.CRS_GEOPACKAGE_EXPORT)
            )
            feature = next(iter(src))
            self.assertEqual(feature["properties"]["name"], self.planning.name)

    def tearDown(self) -> None:
        self.output_path.unlink(missing_ok=True)


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


class TestRemoveExcludes(TransactionTestCase):
    def load_stands(self):
        with open("stands/tests/test_data/stands_over_ocean.geojson") as fp:
            geojson = json.loads(fp.read())

        features = geojson.get("features")
        stands = []
        for i, feature in enumerate(features):
            geometry = GEOSGeometry(json.dumps(feature.get("geometry")))
            stands.append(
                Stand.objects.create(
                    geometry=geometry,
                    size="LARGE",
                    area_m2=2_000_000,
                )
            )
        return stands

    def setUp(self):
        self.datalayer = DataLayerFactory.create(
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POLYGON,
            url="planning/tests/test_data/exclude-layer.geojson",
            info={
                "state_parks": {
                    "crs": "EPSG:4269",
                    "name": "exclusion",
                    "count": 2,
                    "bounds": [
                        -13832099.2129,
                        3833702.5637999997,
                        -12756178.018199999,
                        5160093.5471,
                    ],
                    "driver": "ESRI Shapefile",
                    "schema": {"geometry": "Polygon", "properties": {}},
                    "crs_wkt": 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs"],AUTHORITY["EPSG","3857"]]',
                }
            },
        )
        datalayer_uploaded(self.datalayer.pk)
        self.datalayer.refresh_from_db()
        stands = self.load_stands()
        json_geom = {
            "coordinates": [
                [
                    [-43.06525647059419, 20.40383387788934],
                    [-43.06525647059419, 18.945128930084522],
                    [-41.18944136364237, 18.945128930084522],
                    [-41.18944136364237, 20.40383387788934],
                    [-43.06525647059419, 20.40383387788934],
                ]
            ],
            "type": "Polygon",
        }
        pa_geom = MultiPolygon([GEOSGeometry(json.dumps(json_geom))])
        self.planning_area = PlanningAreaFactory.create(geometry=pa_geom)
        self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.metrics = calculate_stand_vector_stats3(
            self.datalayer,
            self.planning_area.geometry,
            stand_size=StandSizeChoices.LARGE,
        )

    def tearDown(self):
        with connection.cursor() as cur:
            qual_name = qualify_for_django(self.datalayer.table)
            cur.execute(f"DROP TABLE IF EXISTS {qual_name} CASCADE;")

    def test_filter_by_datalayer_removes_stands(self):
        stands = self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.assertEquals(17, len(stands))
        excluded_stands = get_constrained_stands(
            stands,
            self.datalayer,
            metric_column="majority",
            value=1,
        )

        self.assertEqual(11, len(excluded_stands))
