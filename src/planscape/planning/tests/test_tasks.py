import json
from unittest import mock

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.db.models import Union
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TestCase, override_settings
from planning.models import ScenarioResultStatus, GeoPackageStatus
from planning.tasks import (
    async_calculate_stand_metrics,
    async_forsys_run,
    async_pre_forsys_process,
    trigger_geopackage_generation,
)
from stands.models import Stand, StandMetric, StandSizeChoices
from stands.tests.factories import StandFactory
from planning.tests.factories import (
    ScenarioFactory,
    TreatmentGoalFactory,
    PlanningAreaFactory,
)
from planscape.exceptions import ForsysException, ForsysTimeoutException


class AsyncCalculateStandMetricsTest(TestCase):
    def load_stands(self):
        with open("impacts/tests/test_data/stands.geojson") as fp:
            geojson = json.loads(fp.read())

        features = geojson.get("features")
        return list(
            [
                StandFactory.create(
                    geometry=GEOSGeometry(json.dumps(f.get("geometry")), srid=4326),
                    size="LARGE",
                    area_m2=1,
                )
                for f in features
            ]
        )

    def setUp(self):
        self.stands = self.load_stands()
        stand_ids = [s.id for s in self.stands]
        self.planning_area_geometry = MultiPolygon(
            [
                Stand.objects.filter(id__in=stand_ids).aggregate(
                    geometry=Union("geometry")
                )["geometry"]
            ]
        )
        self.datalayer_name = "prio1"
        metadata = {"modules": {"forsys": {"legacy_name": self.datalayer_name}}}
        self.datalayer = DataLayerFactory.create(
            name=self.datalayer_name,
            url="impacts/tests/test_data/test_raster.tif",
            metadata=metadata,
            type=DataLayerType.RASTER,
        )
        self.scenario = ScenarioFactory.create(
            planning_area__geometry=self.planning_area_geometry,
            configuration={
                "stand_size": StandSizeChoices.LARGE,
            },
        )

    def test_async_calculate_stand_metrics(self):
        self.assertEqual(StandMetric.objects.count(), 0)

        async_calculate_stand_metrics(
            planning_area_id=self.scenario.planning_area.pk,
            datalayer_id=self.datalayer.pk,
            stand_size=StandSizeChoices.LARGE,
            grid_key_start="",
        )

        self.assertNotEqual(StandMetric.objects.count(), Stand.objects.count())

    def test_async_calculate_stand_metrics_no_stands(self):
        self.assertEqual(StandMetric.objects.count(), 0)

        self.scenario.planning_area.geometry = MultiPolygon()
        self.scenario.planning_area.save()

        async_calculate_stand_metrics(
            planning_area_id=self.scenario.planning_area.pk,
            datalayer_id=self.datalayer.pk,
            stand_size=StandSizeChoices.LARGE,
            grid_key_start="",
        )

        self.assertEqual(StandMetric.objects.count(), 0)

    def test_async_calculate_stand_metrics_datalayer_does_not_exist(self):
        self.assertEqual(StandMetric.objects.count(), 0)
        async_calculate_stand_metrics(
            planning_area_id=self.scenario.planning_area.pk,
            datalayer_id=9999,  # non-existent datalayer
            stand_size=StandSizeChoices.LARGE,
            grid_key_start="",
        )

        self.assertEqual(StandMetric.objects.count(), 0)

    def test_async_calculate_stand_metrics_planning_area_does_not_exists(self):
        self.assertEqual(StandMetric.objects.count(), 0)
        async_calculate_stand_metrics(
            planning_area_id=9999,  # non-existent planning area
            datalayer_id=self.datalayer.pk,
            stand_size=StandSizeChoices.LARGE,
            grid_key_start="",
        )

        self.assertEqual(StandMetric.objects.count(), 0)


class AsyncPreForsysProcessTest(TestCase):
    def setUp(self):
        configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "max_treatment_area_ratio": 0.3,
            "max_project_count": 10,
            "seed": 42,
            "max_slope": 25,
            "min_distance_from_road": 50,
            "max_area": 40000,
        }
        self.planning_area = PlanningAreaFactory.create(with_stands=True)
        self.treatment_goal = TreatmentGoalFactory.create(with_datalayers=True)
        self.scenario = ScenarioFactory.create(
            treatment_goal=self.treatment_goal, configuration=configuration
        )
        self.slop_datalayer = DataLayerFactory.create(
            name="Slope",
            metadata={"modules": {"forsys": {"name": "slope", "metric_column": "max"}}},
        )
        self.distance_from_road_datalayer = DataLayerFactory.create(
            name="Distance from road",
            metadata={
                "modules": {
                    "forsys": {"name": "distance_from_roads", "metric_column": "min"}
                }
            },
        )

    def test_async_pre_forsys_process(self):
        async_pre_forsys_process(self.scenario.pk)

        self.scenario.refresh_from_db()
        self.assertIsNotNone(self.scenario.forsys_input)

        self.assertEqual(type(self.scenario.forsys_input["stand_ids"]), list)
        self.assertGreater(len(self.scenario.forsys_input["stand_ids"]), 0)

        self.assertEqual(type(self.scenario.forsys_input["datalayers"]), list)
        datalayers = self.scenario.forsys_input["datalayers"]
        self.assertEqual(
            len(datalayers), 5
        )  # 3 datalayers from Tx Goal + slope + distance from roads
        for dl in datalayers:
            self.assertIn("metric", dl.keys())
            self.assertIn("threshold", dl.keys())
            self.assertIn("name", dl.keys())
            self.assertIn("usage_type", dl.keys())
            self.assertIn("id", dl.keys())

        self.assertEqual(type(self.scenario.forsys_input["variables"]), dict)
        variables = self.scenario.forsys_input["variables"]
        self.assertEqual(variables["number_of_projects"], 10)
        self.assertEqual(variables["min_area_project"], 500)
        self.assertEqual(variables["max_area_project"], 40000 / 10)


@override_settings(FEATURE_FLAGS="")
class AsyncCallForsysCommandLine(TestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()

    @mock.patch(
        "utils.cli_utils._call_forsys_via_command_line",
        return_value=True,
    )
    @mock.patch(
        "planning.tasks.async_generate_scenario_geopackage.apply_async",
    )
    def test_async_call_forsys_command_line(self, mock_geopackage, mock_cmd_line):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.SUCCESS)
        self.assertTrue(mock_geopackage.called)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_command_line",
        side_effect=ForsysTimeoutException(
            "Forsys command line call timed out after 60000 seconds."
        ),
    )
    @mock.patch(
        "planning.tasks.async_generate_scenario_geopackage.apply_async",
    )
    def test_async_call_forsys_command_line_timeout(
        self, mock_geopackage, mock_cmd_line
    ):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.TIMED_OUT)
        self.assertFalse(mock_geopackage.called)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_command_line",
        side_effect=ForsysException("Forsys command line call failed"),
    )
    @mock.patch(
        "planning.tasks.async_generate_scenario_geopackage.apply_async",
    )
    def test_async_call_forsys_command_line_panic(self, mock_geopackage, mock_cmd_line):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.PANIC)
        self.assertFalse(mock_geopackage.called)


@override_settings(FEATURE_FLAGS="FORSYS_VIA_API")
class AsyncCallForsysViaAPI(TestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        return_value=True,
    )
    @mock.patch(
        "planning.tasks.async_generate_scenario_geopackage.apply_async",
    )
    def test_async_call_forsys_via_api(self, mock_geopackage, mock_api_call):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.RUNNING)
        self.assertTrue(mock_geopackage.called)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        side_effect=ForsysTimeoutException(
            "Forsys API call timed out after 60000 seconds."
        ),
    )
    @mock.patch(
        "planning.tasks.async_generate_scenario_geopackage.apply_async",
    )
    def test_async_call_forsys_via_api_timeout(self, mock_geopackage, mock_api_call):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.TIMED_OUT)
        self.assertFalse(mock_geopackage.called)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        side_effect=ForsysException("Forsys API call failed"),
    )
    @mock.patch(
        "planning.tasks.async_generate_scenario_geopackage.apply_async",
    )
    def test_async_call_forsys_via_api_panic(self, mock_geopackage, mock_api_call):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.PANIC)
        self.assertFalse(mock_geopackage.called)


class TriggerGeopackageGenerationTestCase(TestCase):
    @mock.patch("planning.tasks.async_generate_scenario_geopackage.delay")
    def test_trigger_geopackage_generation(self, mock_async_generate):
        scenario = ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            geopackage_status=GeoPackageStatus.PENDING,
        )

        trigger_geopackage_generation()

        mock_async_generate.assert_called_once_with(scenario.pk)

    @mock.patch("planning.tasks.async_generate_scenario_geopackage.delay")
    def test_trigger_geopackage_generation_no_pending(self, mock_async_generate):
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            geopackage_status=GeoPackageStatus.PROCESSING,
        )
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            geopackage_status=GeoPackageStatus.SUCCEEDED,
        )
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            geopackage_status=GeoPackageStatus.FAILED,
        )
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            geopackage_status=None,
        )

        trigger_geopackage_generation()
        mock_async_generate.assert_not_called()

    @mock.patch("planning.tasks.async_generate_scenario_geopackage.delay")
    def test_trigger_geopackage_generation_result_status_not_success(
        self, mock_async_generate
    ):
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.PENDING,
            geopackage_status=GeoPackageStatus.PENDING,
        )
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.RUNNING,
            geopackage_status=GeoPackageStatus.PENDING,
        )
        ScenarioFactory.create(
            result_status=ScenarioResultStatus.FAILURE,
            geopackage_status=GeoPackageStatus.PENDING,
        )

        trigger_geopackage_generation()
        mock_async_generate.assert_not_called()
