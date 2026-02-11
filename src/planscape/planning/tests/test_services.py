import csv
import json
import shutil
from datetime import date, datetime
from pathlib import Path
from types import SimpleNamespace
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
from django.test import TestCase, override_settings
from fiona.crs import to_string
from stands.models import StandSizeChoices
from stands.services import calculate_stand_vector_stats_with_stand_list
from stands.tests.factories import StandFactory, StandMetricFactory

from planning.models import (
    PlanningArea,
    PlanningAreaMapStatus,
    ScenarioResultStatus,
    ScenarioStatus,
    ScenarioType,
    TreatmentGoalUsageType,
)
from planning.services import (
    create_planning_area,
    create_scenario,
    create_scenario_from_upload,
    delete_scenario,
    export_planning_area_to_geopackage,
    export_scenario_inputs_to_geopackage,
    export_scenario_stand_outputs_to_geopackage,
    export_to_geopackage,
    export_to_shapefile,
    get_acreage,
    get_available_stand_ids,
    get_constrained_stands,
    get_excluded_stands,
    get_flatten_geojson,
    get_max_area_project,
    get_max_treatable_area,
    get_max_treatable_stand_count,
    get_schema,
    planning_area_covers,
    sanitize_shp_field_name,
    toggle_scenario_status,
    trigger_scenario_run,
    validate_scenario_configuration,
    validate_scenario_treatment_ratio,
)
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
    ScenarioResultFactory,
    TreatmentGoalFactory,
    UserFactory,
)


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


class MaxAreaProjectTest(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create(with_stands=True)

    def test_get_max_area_project__max_area_and_number_of_projects(self):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={
                "targets": {
                    "max_area": 40000,
                    "max_project_count": 10,
                },
            },
        )
        max_project_area = get_max_area_project(scenario=scenario)
        self.assertAlmostEqual(max_project_area, 40000.0)

    def test_get_max_area_project__min_project_area_and_number_of_projects(self):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={
                "stand_size": StandSizeChoices.LARGE,
            },
        )
        max_project_area = get_max_area_project(scenario=scenario)
        self.assertEqual(max_project_area, 494.0)


class ValidateScenarioTreatmentRatioTest(TestCase):
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


class TestSanitizeShpFieldName(TestCase):
    def test_replaces_spaces_with_underscores(self):
        self.assertEqual(
            sanitize_shp_field_name("Expected Annual Total Volume Killed"),
            "expected-annual-total-volume-killed",
        )


class TestFlattenGeojsonSanitization(TestCase):
    def test_get_flatten_geojson_sanitizes_datalayer_and_nested_keys(self):
        scenario = mock.Mock()
        scenario.get_geojson_result.return_value = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": None,
                    "properties": {
                        "datalayer_1": 0.1,
                        "attainment": {"Expected Annual Total Volume Killed": 0.2},
                    },
                }
            ],
        }
        dl = SimpleNamespace(pk=1, name="Expected Annual Total Volume Killed")
        scenario.get_raster_datalayers.return_value = [dl]
        out = get_flatten_geojson(scenario)
        props = out["features"][0]["properties"]
        self.assertIn("datalayer_expected-annual-total-volume-killed", props)
        self.assertIn("attainment_expected-annual-total-volume-killed", props)
        self.assertTrue(all(" " not in k for k in props.keys()))


class ExportToShapefileTest(TestCase):
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
        self.datalayers = DataLayerFactory.create_batch(7, type=DataLayerType.RASTER)
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
        self.preset_scenario = ScenarioFactory.create(
            planning_area=self.planning,
            name="s1",
            user=self.user,
            treatment_goal=self.treatment_goal,
        )
        self.custom_scenario = ScenarioFactory.create(
            planning_area=self.planning,
            name="s2",
            user=self.user,
            type=ScenarioType.CUSTOM,
            with_priority_objectives=self.datalayers[:2],
            with_cobenefits=self.datalayers[2:],
        )
        data = {
            "foo": "abc",
            "bar": 1,
            "baz": 1.2,
            "now": str(datetime.now()),
            "today": date.today(),
        }
        ProjectAreaFactory.create(
            scenario=self.preset_scenario,
            geometry=self.unit_poly,
            data=data,
            created_by=self.user,
            name="foo",
        )
        ScenarioResultFactory.create(
            scenario=self.preset_scenario, status=ScenarioResultStatus.SUCCESS
        )
        ProjectAreaFactory.create(
            scenario=self.custom_scenario,
            geometry=self.unit_poly,
            data=data,
            created_by=self.user,
            name="bar",
        )
        ScenarioResultFactory.create(
            scenario=self.custom_scenario, status=ScenarioResultStatus.SUCCESS
        )

        preset_scenario_forsys_folder = self.preset_scenario.get_forsys_folder()
        if not preset_scenario_forsys_folder.exists():
            preset_scenario_forsys_folder.mkdir(parents=True, exist_ok=True)
        self.preset_scenario_inputs_file = preset_scenario_forsys_folder / "inputs.csv"

        custom_scenario_forsys_folder = self.custom_scenario.get_forsys_folder()
        if not custom_scenario_forsys_folder.exists():
            custom_scenario_forsys_folder.mkdir(parents=True, exist_ok=True)
        self.custom_scenario_inputs_file = custom_scenario_forsys_folder / "inputs.csv"

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
        with open(self.preset_scenario_inputs_file, "w") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(inputs_data_rows)

        with open(self.custom_scenario_inputs_file, "w") as csvfile:
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

        preset_scenario_forsys_folder = self.preset_scenario.get_forsys_folder()
        self.preset_scenario_outputs_file = preset_scenario_forsys_folder / f"stnd_{self.preset_scenario.uuid}.csv"
        with open(self.preset_scenario_outputs_file, "w") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(stnd_data_rows)

        custom_scenario_forsys_folder = self.custom_scenario.get_forsys_folder()
        self.custom_scenario_outputs_file = custom_scenario_forsys_folder / f"stnd_{self.custom_scenario.uuid}.csv"
        with open(self.custom_scenario_outputs_file, "w") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(stnd_data_rows)

        self.preset_scenario_output_path = Path("preset_scenario_test_planning_area.gpkg")
        self.custom_scenario_output_path = Path("custom_scenario_test_planning_area.gpkg")

    @mock.patch("planning.services.upload_file_via_cli", autospec=True)
    def test_export_geopackage_preset_scenario(self, upload_mock):
        invalidate_all()
        output = export_to_geopackage(self.preset_scenario)
        self.assertIsNotNone(output)
        self.assertTrue(output.endswith(".gpkg.zip"))
        self.assertTrue(upload_mock.called)

    @mock.patch("planning.services.upload_file_via_cli", autospec=True)
    def test_export_geopackage_custom_scenario(self, upload_mock):
        invalidate_all()
        output = export_to_geopackage(self.custom_scenario)
        self.assertIsNotNone(output)
        self.assertTrue(output.endswith(".gpkg.zip"))
        self.assertTrue(upload_mock.called)

    @mock.patch("planning.services.upload_file_via_cli", autospec=True)
    def test_export_geopackage_already_existing_preset_scenario(self, upload_mock):
        invalidate_all()
        self.preset_scenario.geopackage_url = "gs://test-bucket/test-folder/test.gpkg.zip"
        self.preset_scenario.save(update_fields=["geopackage_url"])

        output = export_to_geopackage(self.preset_scenario)
        self.assertIsNotNone(output)
        self.assertEqual(self.preset_scenario.geopackage_url, output)
        self.assertFalse(upload_mock.called)

    @mock.patch("planning.services.upload_file_via_cli", autospec=True)
    def test_export_geopackage_already_existing_custom_scenario(self, upload_mock):
        invalidate_all()
        self.custom_scenario.geopackage_url = "gs://test-bucket/test-folder/test.gpkg.zip"
        self.custom_scenario.save(update_fields=["geopackage_url"])

        output = export_to_geopackage(self.custom_scenario)
        self.assertIsNotNone(output)
        self.assertEqual(self.custom_scenario.geopackage_url, output)
        self.assertFalse(upload_mock.called)

    def test_export_planning_area_to_geopackage_preset_scenario(self):
        export_planning_area_to_geopackage(self.planning, self.preset_scenario_output_path)
        layers = fiona.listlayers(self.preset_scenario_output_path)
        self.assertIn("planning_area", layers)
        with fiona.open(self.preset_scenario_output_path, layer="planning_area") as src:
            self.assertEqual(1, len(src))
            self.assertEqual(
                to_string(src.crs), to_string(settings.CRS_GEOPACKAGE_EXPORT)
            )
            feature = next(iter(src))
            self.assertEqual(feature["properties"]["name"], self.planning.name)

    def test_export_planning_area_to_geopackage_custom_scenario(self):
        export_planning_area_to_geopackage(self.planning, self.custom_scenario_output_path)
        layers = fiona.listlayers(self.custom_scenario_output_path)
        self.assertIn("planning_area", layers)
        with fiona.open(self.custom_scenario_output_path, layer="planning_area") as src:
            self.assertEqual(1, len(src))
            self.assertEqual(
                to_string(src.crs), to_string(settings.CRS_GEOPACKAGE_EXPORT)
            )
            feature = next(iter(src))
            self.assertEqual(feature["properties"]["name"], self.planning.name)

    def test_export_stand_outputs_schema_field_names_are_sanitized_preset_scenario_preset_scenario(self):
        self.datalayers[0].name = "Expected Annual Total Volume Killed"
        self.datalayers[0].save(update_fields=["name"])
        stand_inputs = export_scenario_inputs_to_geopackage(
            self.preset_scenario, self.preset_scenario_output_path
        )
        export_scenario_stand_outputs_to_geopackage(
            self.preset_scenario, self.preset_scenario_output_path, stand_inputs
        )
        with fiona.open(self.preset_scenario_output_path, layer="stand_outputs") as src:
            field_names = list(src.schema["properties"].keys())
        self.assertIn("datalayer_expected-annual-total-volume-killed", field_names)
        self.assertTrue(all(" " not in n for n in field_names))

    def test_export_stand_outputs_schema_field_names_are_sanitized_preset_scenario_custom_scenario(self):
        self.datalayers[0].name = "Expected Annual Total Volume Killed"
        self.datalayers[0].save(update_fields=["name"])
        stand_inputs = export_scenario_inputs_to_geopackage(
            self.custom_scenario, self.custom_scenario_output_path
        )
        export_scenario_stand_outputs_to_geopackage(
            self.custom_scenario, self.custom_scenario_output_path, stand_inputs
        )
        with fiona.open(self.custom_scenario_output_path, layer="stand_outputs") as src:
            field_names = list(src.schema["properties"].keys())
        self.assertIn("datalayer_expected-annual-total-volume-killed", field_names)
        self.assertTrue(all(" " not in n for n in field_names))

    def test_export_inputs_schema_renames_spm_and_pcp_fields_preset_scenario(self):
        self.datalayers[5].name = "Some SPM Layer"
        self.datalayers[5].save(update_fields=["name"])
        self.datalayers[6].name = "Some PCP Layer"
        self.datalayers[6].save(update_fields=["name"])
        export_scenario_inputs_to_geopackage(self.preset_scenario, self.preset_scenario_output_path)
        with fiona.open(self.preset_scenario_output_path, layer="stand_inputs") as src:
            field_names = list(src.schema["properties"].keys())
        self.assertIn("datalayer_some-spm-layer_spm", field_names)
        self.assertIn("datalayer_some-pcp-layer_pcp", field_names)
        self.assertTrue(all(" " not in n for n in field_names))

    def test_export_inputs_schema_renames_spm_and_pcp_fields_custom_scenario(self):
        self.datalayers[5].name = "Some SPM Layer"
        self.datalayers[5].save(update_fields=["name"])
        self.datalayers[6].name = "Some PCP Layer"
        self.datalayers[6].save(update_fields=["name"])
        export_scenario_inputs_to_geopackage(self.custom_scenario, self.custom_scenario_output_path)
        with fiona.open(self.custom_scenario_output_path, layer="stand_inputs") as src:
            field_names = list(src.schema["properties"].keys())
        self.assertIn("datalayer_some-spm-layer_spm", field_names)
        self.assertIn("datalayer_some-pcp-layer_pcp", field_names)
        self.assertTrue(all(" " not in n for n in field_names))

    def tearDown(self) -> None:
        self.preset_scenario_output_path.unlink(missing_ok=True)
        self.custom_scenario_output_path.unlink(missing_ok=True)


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


class TestRemoveExcludes(TestCase):
    def load_stands(self):
        with open("stands/tests/test_data/stands_over_ocean.geojson") as fp:
            geojson = json.loads(fp.read())

        features = geojson.get("features")
        stands = []
        for i, feature in enumerate(features):
            geometry = GEOSGeometry(json.dumps(feature.get("geometry")))
            stands.append(
                StandFactory.create(
                    geometry=geometry,
                    size="LARGE",
                    area_m2=2_000_000,
                    with_calculated_grid_key=True,
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
        self.stands = self.load_stands()
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
        self.metrics = calculate_stand_vector_stats_with_stand_list(
            stand_ids=[stand.id for stand in self.stands],
            datalayer=self.datalayer,
        )

    def tearDown(self):
        with connection.cursor() as cur:
            qual_name = qualify_for_django(self.datalayer.table)
            cur.execute(f"DROP TABLE IF EXISTS {qual_name} CASCADE;")
        for stand in self.stands:
            stand.delete()

    def test_get_excluded_stands_excluded_zones(self):
        stands = self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.assertEquals(17, len(stands))
        excluded_stands = get_excluded_stands(
            stands,
            self.datalayer,
        )

        self.assertEqual(11, len(excluded_stands))

    def test_get_constrained_stands_thresholds(self):
        stands = self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.assertEquals(17, len(stands))
        # in this scenario, without operator and with THRESHOLD usagetype
        # we are getting all the stands that are NOT equals 1
        excluded_stands = get_constrained_stands(
            stands,
            self.datalayer,
            metric_column="majority",
            value=1,
            usage_type=TreatmentGoalUsageType.THRESHOLD,
        )

        self.assertEqual(6, len(excluded_stands))

    def test_get_constrained_stands_multiple_datalayers(self):
        another_datalayer = DataLayerFactory.create(
            type=DataLayerType.RASTER,
        )
        stands = self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.assertEquals(17, len(stands))

        for stand in stands:
            StandMetricFactory.create(
                stand=stand,
                datalayer=another_datalayer,
                majority=1,
            )
        # in this scenario, without operator and with THRESHOLD usagetype
        # we are getting all the stands that are NOT equals 1
        excluded_stands = get_constrained_stands(
            stands,
            self.datalayer,
            metric_column="majority",
            value=1,
            usage_type=TreatmentGoalUsageType.THRESHOLD,
        )

        self.assertEqual(6, len(excluded_stands))

    def test_get_available_stands_ids(self):
        stand_ids = get_available_stand_ids(self.planning_area, StandSizeChoices.LARGE)
        stands = self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.assertEquals(17, len(stands))
        self.assertEquals(len(stand_ids), len(stands))

    def test_get_available_stands_ids_with_excluded_area(self):
        stand_ids = get_available_stand_ids(
            self.planning_area, StandSizeChoices.LARGE, [self.datalayer]
        )
        stands = self.planning_area.get_stands(StandSizeChoices.LARGE)
        self.assertEquals(17, len(stands))
        self.assertLess(len(stand_ids), len(stands))


class ValidateScenarioConfigurationTest(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create(with_stands=True)
        self.treatment_goal = TreatmentGoalFactory.create()
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            treatment_goal=self.treatment_goal,
            configuration={},
        )

    def test_missing_stand_size(self):
        self.scenario.configuration = {
            "targets": {"max_area": 500, "max_project_count": 2}
        }
        errors = validate_scenario_configuration(self.scenario)
        self.assertIn("Configuration field `stand_size` is required.", errors)

    def test_missing_max_area(self):
        self.scenario.configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {"max_project_count": 2},
        }
        errors = validate_scenario_configuration(self.scenario)
        self.assertIn(
            "Configuration target `max_area` (number of acres) is required.", errors
        )

    def test_max_area_below_minimum(self):
        # LARGE uses MIN_AREA_PROJECT_LARGE from settings
        below_min = settings.MIN_AREA_PROJECT_LARGE - 1
        self.scenario.configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {"max_area": below_min, "max_project_count": 2},
        }
        errors = validate_scenario_configuration(self.scenario)
        self.assertTrue(any("must be at least" in e for e in errors))

    def test_missing_max_project_count(self):
        self.scenario.configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {"max_area": 500},
        }
        errors = validate_scenario_configuration(self.scenario)
        self.assertIn("Configuration field `max_project_count` is required.", errors)

    def test_zero_available_stands(self):
        # Mocking that available_stands is zero
        self.scenario.configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {"max_area": 500, "max_project_count": 2},
            "excluded_areas_ids": [],
        }
        with mock.patch("planning.services.get_available_stand_ids", return_value=[]):
            errors = validate_scenario_configuration(self.scenario)
            self.assertIn(
                "No stands are available with the current configuration.", errors
            )

    def test_insufficient_available_stands(self):
        self.scenario.configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {"max_area": 500, "max_project_count": 99},
        }
        with mock.patch(
            "planning.services.get_available_stand_ids", return_value=[1, 2]
        ):
            errors = validate_scenario_configuration(self.scenario)
            self.assertIn("Not enough stands are available", " ".join(errors))

    def test_valid_configuration(self):
        self.scenario.configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {"max_area": 9999, "max_project_count": 2},
        }
        with mock.patch(
            "planning.services.get_available_stand_ids", return_value=[1, 2, 3]
        ):
            errors = validate_scenario_configuration(self.scenario)
            self.assertEqual(errors, [])


class CreateScenarioGuardTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.treatment_goal = TreatmentGoalFactory.create()
        self.planning_area_ok = PlanningAreaFactory.create()
        self.planning_area_oversize = PlanningAreaFactory.create()
        self.planning_area_oversize.map_status = PlanningAreaMapStatus.OVERSIZE
        self.planning_area_oversize.save(update_fields=["map_status"])

    def test_accepts_planning_area_as_object(self):
        scenario = create_scenario(
            user=self.user,
            name="ok-object",
            planning_area=self.planning_area_ok,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": {"max_area": 500, "max_project_count": 2},
            },
        )
        self.assertIsNotNone(scenario.id)

    def test_accepts_planning_area_as_id(self):
        scenario = create_scenario(
            user=self.user,
            name="ok-id",
            planning_area=self.planning_area_ok.pk,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": {"max_area": 500, "max_project_count": 2},
            },
        )
        self.assertIsNotNone(scenario.id)

    def test_blocks_oversize_planning_area(self):
        with self.assertRaises(ValueError) as ctx:
            create_scenario(
                user=self.user,
                name="blocked",
                planning_area=self.planning_area_oversize,
                treatment_goal=self.treatment_goal,
                configuration={
                    "stand_size": "LARGE",
                    "targets": {"max_area": 500, "max_project_count": 2},
                },
            )
        self.assertIn("oversize", str(ctx.exception).lower())


class ScenarioCountTrackingTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.treatment_goal = TreatmentGoalFactory.create()
        self.planning_area = PlanningAreaFactory.create(
            user=self.user,
            scenario_count=0,
            map_status=PlanningAreaMapStatus.STANDS_DONE,
        )

    def test_create_scenario_increments_planning_area_scenario_count(self):
        self.planning_area.scenario_count = 0
        self.planning_area.save(update_fields=["scenario_count"])
        create_scenario(
            user=self.user,
            name="count-create-scenario",
            planning_area=self.planning_area,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": {"max_area": 500, "max_project_count": 2},
            },
        )
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.scenario_count, 1)

    def test_create_scenario_from_upload_increments_planning_area_scenario_count(self):
        self.planning_area.scenario_count = None
        self.planning_area.save(update_fields=["scenario_count"])
        create_scenario_from_upload(
            validated_data={
                "name": "count-upload-scenario",
                "stand_size": "LARGE",
                "planning_area": self.planning_area.pk,
                "geometry": {"type": "FeatureCollection", "features": []},
            },
            user=self.user,
        )
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.scenario_count, 1)

    def test_toggle_scenario_status_updates_planning_area_scenario_count(self):
        self.planning_area.scenario_count = None
        self.planning_area.save(update_fields=["scenario_count"])
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.user,
            status=ScenarioStatus.ARCHIVED,
        )
        toggle_scenario_status(scenario, self.user)
        scenario.refresh_from_db()
        self.planning_area.refresh_from_db()
        self.assertEqual(scenario.status, ScenarioStatus.ACTIVE)
        self.assertEqual(self.planning_area.scenario_count, 1)
        toggle_scenario_status(scenario, self.user)
        scenario.refresh_from_db()
        self.planning_area.refresh_from_db()
        self.assertEqual(scenario.status, ScenarioStatus.ARCHIVED)
        self.assertEqual(self.planning_area.scenario_count, 0)

    def test_delete_scenario_decrements_count_for_active_scenario(self):
        self.planning_area.scenario_count = 1
        self.planning_area.save(update_fields=["scenario_count"])
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.user,
            status=ScenarioStatus.ACTIVE,
        )
        ok, _msg = delete_scenario(user=self.user, scenario=scenario)
        self.assertTrue(ok)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.scenario_count, 0)

    def test_delete_scenario_does_not_decrement_count_for_archived_scenario(self):
        self.planning_area.scenario_count = 0
        self.planning_area.save(update_fields=["scenario_count"])
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.user,
            status=ScenarioStatus.ARCHIVED,
        )
        ok, _msg = delete_scenario(user=self.user, scenario=scenario)
        self.assertTrue(ok)
        self.planning_area.refresh_from_db()
        self.assertEqual(self.planning_area.scenario_count, 0)

    def test_create_scenario_allows_reusing_name_after_soft_delete(self):
        scenario_name = "reusable-scenario-name"
        deleted_scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            user=self.user,
            name=scenario_name,
            status=ScenarioStatus.ACTIVE,
        )

        ok, _msg = delete_scenario(user=self.user, scenario=deleted_scenario)
        self.assertTrue(ok)

        recreated_scenario = create_scenario(
            user=self.user,
            name=scenario_name,
            planning_area=self.planning_area,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": {"max_area": 500, "max_project_count": 2},
            },
        )

        self.assertEqual(recreated_scenario.name, scenario_name)


@override_settings(OVERSIZE_PLANNING_AREA_ACRES=100)
class CreatePlanningAreaOversizeTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.geom = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 0 2, 2 2, 2 0, 0 0)))", srid=4269
        )

    @mock.patch("planning.services.get_acreage", return_value=150)
    def test_oversize_planning_area_sets_status_oversize(self, _mock_get_acreage):
        pa = create_planning_area(
            user=self.user,
            name="Oversize PA",
            region_name="sierra-nevada",
            geometry=self.geom,
        )

        pa.refresh_from_db()
        self.assertEqual(pa.map_status, PlanningAreaMapStatus.OVERSIZE)


class TriggerScenarioRunGuardTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.treatment_goal = TreatmentGoalFactory.create()
        self.planning_area_oversize = PlanningAreaFactory.create(
            map_status=PlanningAreaMapStatus.OVERSIZE
        )

    def test_blocks_trigger_run_on_oversize_planning_area(self):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area_oversize,
            treatment_goal=self.treatment_goal,
            configuration={
                "stand_size": "LARGE",
                "targets": {"max_area": 500, "max_project_count": 2},
            },
        )

        with self.assertRaises(ValueError) as ctx:
            trigger_scenario_run(scenario, self.user)

        self.assertIn("oversize", str(ctx.exception).lower())
