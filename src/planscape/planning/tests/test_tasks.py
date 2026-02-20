import json
from unittest import mock

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.db.models import Union
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TestCase, override_settings
from django.utils import timezone
from planning.models import (
    GeoPackageStatus,
    ScenarioPlanningApproach,
    ScenarioResult,
    ScenarioResultStatus,
    ScenarioType,
)
from planning.tasks import (
    async_calculate_stand_metrics_with_stand_list,
    async_forsys_run,
    async_pre_forsys_process,
    async_send_email_large_planning_area,
    async_send_email_scenario_finished,
    prepare_scenarios_for_forsys_and_run,
    trigger_geopackage_generation,
    trigger_scenario_ready_emails,
)
from planning.tests.factories import (
    PlanningAreaFactory,
    ScenarioFactory,
    TreatmentGoalFactory,
)
from stands.models import Stand, StandMetric, StandSizeChoices
from stands.tests.factories import StandFactory

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
        self.stand_ids = [s.id for s in self.stands]
        self.planning_area_geometry = MultiPolygon(
            [
                Stand.objects.filter(id__in=self.stand_ids).aggregate(
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

        async_calculate_stand_metrics_with_stand_list(
            stand_ids=self.stand_ids,
            datalayer_id=self.datalayer.pk,
        )

        self.assertNotEqual(StandMetric.objects.count(), Stand.objects.count())

    def test_async_calculate_stand_metrics_no_stands(self):
        self.assertEqual(StandMetric.objects.count(), 0)
        async_calculate_stand_metrics_with_stand_list(
            stand_ids=[],
            datalayer_id=self.datalayer.pk,
        )

        self.assertEqual(StandMetric.objects.count(), 0)

    def test_async_calculate_stand_metrics_datalayer_does_not_exist(self):
        self.assertEqual(StandMetric.objects.count(), 0)
        async_calculate_stand_metrics_with_stand_list(
            stand_ids=self.stand_ids,
            datalayer_id=9999,  # non-existent datalayer
        )

        self.assertEqual(StandMetric.objects.count(), 0)


class AsyncPreForsysProcessTest(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create(with_stands=True)
        self.treatment_goal = TreatmentGoalFactory.create(with_datalayers=True)
        self.slope_datalayer = DataLayerFactory.create(
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
        configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "targets": {
                "max_project_count": 10,
                "max_area": 4000,
            },
            "constraints": [
                {
                    "datalayer": self.slope_datalayer.id,
                    "operator": "lte",
                    "value": "25",
                },
                {
                    "datalayer": self.distance_from_road_datalayer.id,
                    "operator": "gte",
                    "value": "50",
                },
            ],
            "seed": 42,
        }
        self.scenario = ScenarioFactory.create(
            treatment_goal=self.treatment_goal,
            configuration=configuration,
            type=ScenarioType.PRESET,
            planning_approach=ScenarioPlanningApproach.OPTIMIZE_PROJECT_AREAS,
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
        self.assertEqual(variables["min_area_project"], 494)
        self.assertEqual(variables["max_area_project"], 4000)

        self.assertTrue(self.scenario.forsys_input.get("run_with_patchmax"))
        self.assertDictEqual(self.scenario.forsys_input.get("projects_data"), {})

    def test_async_pre_forsys_process_custom_scenario(self):
        priority = DataLayerFactory.create(type=DataLayerType.RASTER)
        cobenefit = DataLayerFactory.create(type=DataLayerType.RASTER)
        configuration = {
            "stand_size": StandSizeChoices.LARGE,
            "priority_objectives": [priority.id],
            "cobenefits": [cobenefit.id],
        }
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            treatment_goal=None,
            type=ScenarioType.CUSTOM,
            configuration=configuration,
        )

        async_pre_forsys_process(scenario.pk)

        scenario.refresh_from_db()
        self.assertIsNotNone(scenario.forsys_input)

        datalayers = scenario.forsys_input["datalayers"]
        self.assertEqual(len(datalayers), 2)
        self.assertEqual(
            {datalayer["id"] for datalayer in datalayers},
            {priority.id, cobenefit.id},
        )
        self.assertEqual(
            {datalayer["usage_type"] for datalayer in datalayers},
            {"PRIORITY", "SECONDARY_METRIC"},
        )

    @mock.patch("planning.services.get_sub_units_stands_lookup_table", return_value={"1" : [8, 9], "2": [7, 6, 5], "3": [4]})
    def test_async_pre_forsys_process_sub_units(self, mock):
        configuration = self.scenario.configuration
        sub_units_datalayer = DataLayerFactory.create(type=DataLayerType.VECTOR)
        configuration.update({"sub_units_layer": sub_units_datalayer.pk})
        self.scenario.configuration = configuration
        self.scenario.planning_approach = ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS
        self.scenario.save()

        async_pre_forsys_process(self.scenario.pk)

        self.scenario.refresh_from_db()
        forsys_input = self.scenario.forsys_input
        self.assertFalse(forsys_input.get("run_with_patchmax"))
        self.assertDictEqual(self.scenario.forsys_input.get("projects_data"), {"1" : [8, 9], "2": [7, 6, 5], "3": [4]})


class PrepareScenariosForForsysTest(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create(with_stands=True)

    @mock.patch("planning.tasks.chord")
    def test_prepare_scenario_preset_missing_treatment_goal(self, mock_chord):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            treatment_goal=None,
            type=ScenarioType.PRESET,
        )

        prepare_scenarios_for_forsys_and_run(scenario.pk)

        mock_chord.assert_not_called()

    @mock.patch("planning.tasks.group")
    @mock.patch("planning.tasks.chord")
    def test_prepare_scenario_custom_uses_config_datalayers(
        self, mock_chord, mock_group
    ):
        mock_group.side_effect = lambda tasks: tasks
        mock_chord.return_value = mock.Mock(
            on_error=mock.Mock(), apply_async=mock.Mock()
        )
        mock_chord.return_value.on_error.return_value = mock_chord.return_value

        priority = DataLayerFactory.create(type=DataLayerType.RASTER)
        cobenefit = DataLayerFactory.create(type=DataLayerType.RASTER)
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            treatment_goal=None,
            type=ScenarioType.CUSTOM,
            configuration={
                "priority_objectives": [priority.id],
                "cobenefits": [cobenefit.id],
            },
        )

        prepare_scenarios_for_forsys_and_run(scenario.pk)

        mock_chord.assert_called_once()

    @mock.patch("planning.tasks.group")
    @mock.patch("planning.tasks.chord")
    def test_prepare_scenario_preset_uses_treatment_goal_datalayers(
        self, mock_chord, mock_group
    ):
        mock_group.side_effect = lambda tasks: tasks
        mock_chord.return_value = mock.Mock(
            on_error=mock.Mock(), apply_async=mock.Mock()
        )
        mock_chord.return_value.on_error.return_value = mock_chord.return_value

        treatment_goal = TreatmentGoalFactory.create()
        datalayer = DataLayerFactory.create(type=DataLayerType.RASTER)
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            treatment_goal=treatment_goal,
            type=ScenarioType.PRESET,
        )
        with mock.patch.object(
            treatment_goal, "get_raster_datalayers", return_value=[datalayer]
        ):
            prepare_scenarios_for_forsys_and_run(scenario.pk)

        mock_chord.assert_called_once()


class AsyncCallForsysViaAPI(TestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()
        self.scenario_result = ScenarioResult.objects.create(scenario=self.scenario)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        return_value=True,
    )
    def test_async_call_forsys_via_api(self, mock_api_call):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.RUNNING)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        side_effect=ForsysTimeoutException(
            "Forsys API call timed out after 60000 seconds."
        ),
    )
    def test_async_call_forsys_via_api_timeout(self, mock_api_call):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.TIMED_OUT)
        self.scenario_result.refresh_from_db()
        self.assertEqual(self.scenario_result.status, ScenarioResultStatus.TIMED_OUT)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        side_effect=ForsysException("Forsys API call failed"),
    )
    def test_async_call_forsys_via_api_panic(self, mock_api_call):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.PANIC)
        self.scenario_result.refresh_from_db()
        self.assertEqual(self.scenario_result.status, ScenarioResultStatus.PANIC)


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
    def test_trigger_geopackage_generation_falied_scenario(self, mock_async_generate):
        scenario = ScenarioFactory.create(
            result_status=ScenarioResultStatus.FAILURE,
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
            result_status=ScenarioResultStatus.PANIC,
            geopackage_status=GeoPackageStatus.PENDING,
        )

        trigger_geopackage_generation()
        mock_async_generate.assert_not_called()


@override_settings(ENV="staging")
@mock.patch("planning.tasks.send_mail")
class ScenarioEmailLinkTestCase(TestCase):
    def test_ready_email_contains_frontend_link(self, mock_send_mail):
        scenario = ScenarioFactory.create(user__email="owner@example.com")

        async_send_email_scenario_finished(scenario.pk)

        _, kwargs = mock_send_mail.call_args
        html_body = kwargs["html_message"]
        txt_body = kwargs["message"]

        expected_base = "https://staging.planscape.org"
        expected_path = f"/plan/{scenario.planning_area_id}/scenario/{scenario.pk}"

        self.assertIn(expected_base, html_body)
        self.assertIn(expected_path, html_body)
        self.assertIn(expected_base, txt_body)
        self.assertIn(expected_path, txt_body)


class TriggerScenarioReadyEmailsTestCase(TestCase):
    @mock.patch("planning.tasks.async_send_email_scenario_finished.delay")
    def test_triggers_for_success_scenarios_without_ready_timestamp(
        self, mock_email_delay
    ):
        scenario_ok = ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            ready_email_sent_at=None,
            user__email="owner@example.com",
        )
        scenario_pending = ScenarioFactory.create(
            result_status=ScenarioResultStatus.PENDING,
            ready_email_sent_at=None,
            user__email="owner@example.com",
        )
        scenario_already_sent = ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            ready_email_sent_at=timezone.now(),
            user__email="owner@example.com",
        )
        scenario_no_user = ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            ready_email_sent_at=None,
            user=None,
        )
        scenario_blank_email = ScenarioFactory.create(
            result_status=ScenarioResultStatus.SUCCESS,
            ready_email_sent_at=None,
        )

        scenario_blank_email.user.email = ""
        scenario_blank_email.user.save(update_fields=["email"])
        trigger_scenario_ready_emails()

        mock_email_delay.assert_called_once_with(scenario_ok.pk)
        scenario_ok.refresh_from_db()
        self.assertIsNotNone(scenario_ok.ready_email_sent_at)

        scenario_pending.refresh_from_db()
        self.assertIsNone(scenario_pending.ready_email_sent_at)

        scenario_already_sent.refresh_from_db()
        self.assertIsNotNone(scenario_already_sent.ready_email_sent_at)

        scenario_no_user.refresh_from_db()
        self.assertIsNone(scenario_no_user.ready_email_sent_at)

        scenario_blank_email.refresh_from_db()
        self.assertIsNone(scenario_blank_email.ready_email_sent_at)

    @mock.patch("planning.tasks.send_mail", return_value=True)
    def test_dont_send_email_if_user_email_is_whitespace(self, send_email_mock):
        scen = ScenarioFactory.create()
        scen.user.email = "   "
        scen.user.save(update_fields=["email"])
        async_send_email_scenario_finished(scen.pk)
        self.assertFalse(send_email_mock.called)


@override_settings(
    ENV="staging",
    OVERSIZE_PLANNING_AREA_ACRES=100,
    SUPPORT_EMAIL="support@example.com",
)
class AsyncSendEmailLargePlanningAreaTest(TestCase):
    def setUp(self):
        self.pa = PlanningAreaFactory.create(
            user__email="owner@example.com", name="Big PA"
        )

    @mock.patch("planning.tasks.send_mail", return_value=True)
    @mock.patch("planning.tasks.get_acreage", return_value=150)
    def test_trigger_email_when_oversize(self, _mock_acreage, send_email_mock):
        async_send_email_large_planning_area(self.pa.pk)

        self.assertTrue(send_email_mock.called)
        send_email_mock.assert_called_once_with(
            subject="Large Planning Area Created",
            from_email=mock.ANY,
            recipient_list=["support@example.com"],
            message=mock.ANY,
            html_message=mock.ANY,
        )

        # Inspect email body for correct frontend link
        _, kwargs = send_email_mock.call_args
        html_body = kwargs["html_message"]
        txt_body = kwargs["message"]

        expected_base = "https://staging.planscape.org"
        expected_path = f"/plan/{self.pa.pk}"

        self.assertIn(expected_base, html_body)
        self.assertIn(expected_path, html_body)
        self.assertIn(expected_base, txt_body)
        self.assertIn(expected_path, txt_body)

    @mock.patch("planning.tasks.send_mail", return_value=True)
    @mock.patch("planning.tasks.get_acreage", return_value=100)
    def test_dont_send_email_when_equal_to_threshold(
        self, _mock_acreage, send_email_mock
    ):
        async_send_email_large_planning_area(self.pa.pk)
        self.assertFalse(send_email_mock.called)

    @mock.patch("planning.tasks.send_mail", return_value=True)
    @mock.patch("planning.tasks.get_acreage", return_value=50)
    def test_dont_send_email_when_below_threshold(self, _mock_acreage, send_email_mock):
        async_send_email_large_planning_area(self.pa.pk)
        self.assertFalse(send_email_mock.called)

    @mock.patch("planning.tasks.send_mail", return_value=True)
    def test_dont_send_email_if_planning_area_deleted(self, send_email_mock):
        pk = self.pa.pk
        self.pa.delete()
        async_send_email_large_planning_area(pk)
        self.assertFalse(send_email_mock.called)
