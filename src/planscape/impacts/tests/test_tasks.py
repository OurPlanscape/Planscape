import json

from unittest import mock
from django.test import TransactionTestCase
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.contrib.gis.db.models import Union

from impacts.tests.factories import TreatmentPlanFactory
from impacts.tasks import (
    async_send_email_process_finished,
    async_calculate_impacts_for_variable_action_year,
    async_calculate_baseline_metrics_for_variable_year,
)
from stands.models import Stand
from impacts.services import (
    get_calculation_matrix,
)
from impacts.models import (
    AVAILABLE_YEARS,
    ProjectAreaTreatmentResult,
    TreatmentPrescriptionAction,
    TreatmentResult,
    ImpactVariable,
)
from stands.models import StandMetric
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from impacts.tests.factories import (
    TreatmentPlanFactory,
    TreatmentPrescriptionFactory,
)
from planning.tests.factories import (
    ProjectAreaFactory,
)


class AsyncSendEmailProcessFinishedTest(TransactionTestCase):
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


class AsyncGetOrCalculatePersistImpactsTestCase(TransactionTestCase):
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
        self.prescriptions = list(
            [
                TreatmentPrescriptionFactory.create(
                    treatment_plan=self.plan,
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
            stands_within_project_area = self.project_area.get_stands()
            self.assertEquals(
                stands_within_project_area.count(), TreatmentResult.objects.count()
            )


class AsyncCalculateBaselineMetricsForVariableYearTest(TransactionTestCase):
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

    def test_calculate_baseline_metrics_for_variable_year(self):
        with self.settings(
            CELERY_ALWAYS_EAGER=True,
            CELERY_TASK_STORE_EAGER_RESULT=True,
            CELERY_TASK_IGNORE_RESULT=False,
        ):
            variable = ImpactVariable.FLAME_LENGTH
            year = AVAILABLE_YEARS[0]
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
            DataLayerFactory.create(
                name="baseline",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=baseline_metadata,
                type=DataLayerType.RASTER,
            )
            async_calculate_baseline_metrics_for_variable_year(
                self.plan.id,
                variable=variable,
                year=year,
            )
            stands_within_project_area = self.project_area.get_stands()
            self.assertEquals(
                stands_within_project_area.count(), StandMetric.objects.count()
            )
