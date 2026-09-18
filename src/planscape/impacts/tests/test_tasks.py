import json
from unittest import mock

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.db.models import Union
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TestCase
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from planning.models import GeoPackageStatus
from stands.models import Stand

from impacts.models import (
    ProjectAreaTreatmentResult,
    ImpactVariable,
    TreatmentPlanStatus,
    TreatmentPrescriptionAction,
    TreatmentResult,
)
from impacts.services import get_calculation_matrix
from impacts.tasks import (
    async_calculate_persist_impacts_treatment_plan,
    async_calculate_impacts_for_variable_action_year,
    async_generate_treatment_plan_geopackage,
    async_send_email_process_finished,
)
from impacts.tests.factories import TreatmentPlanFactory, TreatmentPrescriptionFactory


class AsyncSendEmailProcessFinishedTest(TestCase):
    def setUp(self):
        self.treatment_plan = TreatmentPlanFactory.create()
        self.user = self.treatment_plan.created_by

    @mock.patch("impacts.tasks.send_mail", return_value=True)
    def test_trigger_email(self, send_email_mock):
        async_send_email_process_finished(
            treatment_plan_pk=self.treatment_plan.pk,
        )
        self.assertTrue(send_email_mock.called)

        send_email_mock.assert_called_once_with(
            subject="Planscape Treatment Plan is completed",
            from_email=mock.ANY,
            recipient_list=[self.user.email],
            message=mock.ANY,
            html_message=mock.ANY,
        )

    @mock.patch("impacts.tasks.send_mail", return_value=True)
    def test_dont_send_email_if_treatment_plan_deleted(self, send_email_mock):
        self.treatment_plan.delete()
        async_send_email_process_finished(
            treatment_plan_pk=self.treatment_plan.pk,
        )
        self.assertFalse(send_email_mock.called)


class AsyncTreatmentPlanGeopackageTest(TestCase):
    @mock.patch("impacts.tasks.export_and_upload_geopackage")
    def test_async_generate_treatment_plan_geopackage(self, mock_export):
        treatment_plan = TreatmentPlanFactory.create()
        mock_export.return_value = "gs://test-bucket/geopackages/test.gpkg.zip"

        result = async_generate_treatment_plan_geopackage(treatment_plan.pk)

        self.assertEqual(result, "gs://test-bucket/geopackages/test.gpkg.zip")
        mock_export.assert_called_once_with(treatment_plan)

    @mock.patch("impacts.tasks.chord")
    @mock.patch("impacts.tasks.chain")
    @mock.patch("impacts.tasks.async_send_email_process_finished.si")
    @mock.patch("impacts.tasks.async_set_status.si")
    @mock.patch("impacts.tasks.async_generate_treatment_plan_geopackage.si")
    @mock.patch("impacts.tasks.get_calculation_matrix_wo_action")
    @mock.patch("impacts.tasks.get_calculation_matrix")
    def test_persist_impacts_callback_generates_geopackage_before_success_callbacks(
        self,
        mock_get_calculation_matrix,
        mock_get_calculation_matrix_wo_action,
        mock_generate_si,
        mock_set_status_si,
        mock_email_si,
        mock_chain,
        mock_chord,
    ):
        treatment_plan = TreatmentPlanFactory.create(
            geopackage_url="gs://test-bucket/old.gpkg.zip",
            geopackage_status=GeoPackageStatus.SUCCEEDED,
        )
        mock_get_calculation_matrix.return_value = [
            (
                ImpactVariable.CANOPY_COVER,
                TreatmentPrescriptionAction.HEAVY_MASTICATION,
                2024,
            )
        ]
        mock_get_calculation_matrix_wo_action.return_value = [
            (ImpactVariable.CANOPY_COVER, 2024)
        ]
        mock_generate_si.return_value = "generate-geopackage"
        mock_set_status_si.side_effect = [
            "success-status",
            "failure-status",
        ]
        mock_email_si.return_value = "send-email"
        callback = mock.Mock()
        callback_with_error_handler = mock.Mock()
        callback.on_error.return_value = callback_with_error_handler
        mock_chain.return_value = callback
        chord_runner = mock.Mock()
        mock_chord.return_value = chord_runner

        async_calculate_persist_impacts_treatment_plan(
            treatment_plan.pk,
            treatment_plan.created_by.pk,
        )

        mock_chain.assert_called_once_with(
            "generate-geopackage",
            "success-status",
        )
        mock_generate_si.assert_called_once_with(treatment_plan_pk=treatment_plan.pk)
        mock_set_status_si.assert_any_call(
            treatment_plan_pk=treatment_plan.pk,
            status=TreatmentPlanStatus.SUCCESS,
            start=False,
            user_id=treatment_plan.created_by.pk,
        )
        mock_email_si.assert_called_once_with(treatment_plan_pk=treatment_plan.pk)
        callback.on_error.assert_called_once_with("failure-status")
        callback_with_error_handler.link.assert_called_once_with("send-email")
        chord_runner.assert_called_once_with(callback_with_error_handler)
        treatment_plan.refresh_from_db()
        self.assertIsNone(treatment_plan.geopackage_url)
        self.assertEqual(treatment_plan.geopackage_status, GeoPackageStatus.PENDING)


class AsyncGetOrCalculatePersistImpactsTestCase(TestCase):
    def load_stands(self):
        with open("impacts/tests/test_data/stands.geojson") as fp:
            geojson = json.loads(fp.read())

        features = geojson.get("features")
        return list(
            [
                Stand.objects.create(
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
        self.project_area_geometry = MultiPolygon(
            [
                Stand.objects.filter(id__in=stand_ids).aggregate(
                    geometry=Union("geometry")
                )["geometry"]
            ]
        )
        self.pa = PlanningAreaFactory.create(
            with_stands=False, geometry=self.project_area_geometry
        )
        self.scenario = ScenarioFactory.create(planning_area=self.pa)
        self.plan = TreatmentPlanFactory.create(scenario=self.scenario)

        self.project_area = ProjectAreaFactory.create(
            scenario=self.plan.scenario, geometry=self.project_area_geometry
        )
        self.prescriptions = list(
            [
                TreatmentPrescriptionFactory.create(
                    treatment_plan=self.plan,
                    project_area=self.project_area,
                    stand=stand,
                    action=TreatmentPrescriptionAction.HEAVY_MASTICATION,
                    geometry=stand.geometry,
                )
                for stand in self.stands
            ]
        )

    def test_calculate_impacts_returns_data(self):
        """Test that this function is performing work correctly. we don't
        really care about the returned values right now, only that it works.
        """
        with self.settings(
            CELERY_ALWAYS_EAGER=True,
            CELERY_TASK_STORE_EAGER_RESULT=True,
            CELERY_TASK_IGNORE_RESULT=False,
        ):
            matrix = get_calculation_matrix(self.plan)
            variable, action, year = matrix[0]
            baseline_metadata = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "variable": variable,
                        "action": None,
                        "baseline": True,
                    }
                }
            }
            action_metadata = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "variable": variable,
                        "action": TreatmentPrescriptionAction.get_file_mapping(action),
                        "baseline": False,
                    }
                }
            }

            DataLayerFactory.create(
                name="baseline",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=baseline_metadata,
                type=DataLayerType.RASTER,
            )
            DataLayerFactory.create(
                name="action",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=action_metadata,
                type=DataLayerType.RASTER,
            )
            self.assertEquals(TreatmentResult.objects.count(), 0)

            async_calculate_impacts_for_variable_action_year(
                self.plan.id,
                variable=variable,
                action=action,
                year=year,
            )

            self.assertGreater(TreatmentResult.objects.count(), 0)
            self.assertGreater(ProjectAreaTreatmentResult.objects.count(), 0)
            self.assertEquals(len(self.stands), TreatmentResult.objects.count())

    def test_trigger_task_with_delted_tx_plan(self):
        with self.settings(
            CELERY_ALWAYS_EAGER=True,
            CELERY_TASK_STORE_EAGER_RESULT=True,
            CELERY_TASK_IGNORE_RESULT=False,
        ):
            matrix = get_calculation_matrix(self.plan)
            variable, action, year = matrix[0]
            baseline_metadata = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "variable": variable,
                        "action": None,
                        "baseline": True,
                    }
                }
            }
            action_metadata = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "variable": variable,
                        "action": TreatmentPrescriptionAction.get_file_mapping(action),
                        "baseline": False,
                    }
                }
            }

            DataLayerFactory.create(
                name="baseline",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=baseline_metadata,
                type=DataLayerType.RASTER,
            )
            DataLayerFactory.create(
                name="action",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=action_metadata,
                type=DataLayerType.RASTER,
            )
            self.assertEquals(TreatmentResult.objects.count(), 0)

            self.plan.delete()
            async_calculate_impacts_for_variable_action_year(
                self.plan.id,
                variable=variable,
                action=action,
                year=year,
            )

            self.assertEquals(TreatmentResult.objects.count(), 0)
            self.assertEquals(ProjectAreaTreatmentResult.objects.count(), 0)


class AsyncCalculateBaselineMetricsForVariableYearTest(TestCase):
    def load_stands(self):
        with open("impacts/tests/test_data/stands.geojson") as fp:
            geojson = json.loads(fp.read())

        features = geojson.get("features")
        return list(
            [
                Stand.objects.create(
                    geometry=GEOSGeometry(json.dumps(f.get("geometry")), srid=4326),
                    size="LARGE",
                    area_m2=1,
                )
                for f in features
            ]
        )

    def setUp(self):
        self.stands = self.load_stands()
        self.plan = TreatmentPlanFactory.create()
        stand_ids = [s.id for s in self.stands]
        self.project_area_geometry = MultiPolygon(
            [
                Stand.objects.filter(id__in=stand_ids).aggregate(
                    geometry=Union("geometry")
                )["geometry"]
            ]
        )
        self.project_area = ProjectAreaFactory.create(
            scenario=self.plan.scenario, geometry=self.project_area_geometry
        )
