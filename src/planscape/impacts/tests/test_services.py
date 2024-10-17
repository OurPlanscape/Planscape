import json
from unittest import mock
from django.test import TransactionTestCase
from django.contrib.gis.geos import GEOSGeometry
from impacts.models import (
    ImpactVariable,
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
    TreatmentPrescriptionType,
    TreatmentResult,
)
from impacts.services import (
    calculate_impacts,
    clone_treatment_plan,
    get_calculation_matrix,
    upsert_treatment_prescriptions,
    generate_summary,
)
from impacts.tasks import (
    async_get_or_calculate_persist_impacts,
    async_calculate_persist_impacts_treatment_plan,
)
from impacts.tests.factories import TreatmentPlanFactory, TreatmentPrescriptionFactory
from planning.tests.factories import ProjectAreaFactory, ScenarioFactory
from stands.models import Stand, StandSizeChoices
from stands.tests.factories import StandFactory


class UpsertTreatmentPrescriptionTest(TransactionTestCase):
    def setUp(self):
        self.treatment_plan = TreatmentPlanFactory.create()
        self.project_area = ProjectAreaFactory.create(
            scenario=self.treatment_plan.scenario
        )
        # self.prescriptions = TreatmentPrescriptionFactory.create_batch(
        #     size=5,
        #     **{
        #         "treatment_plan": self.treatment_plan,
        #         "project_area": self.project_area,
        #     },
        # )
        self.stand1 = StandFactory.create()
        self.stand2 = StandFactory.create()
        self.stand3 = StandFactory.create()

    def test_upsert_does_not_create_new_prescription(self):
        user = self.treatment_plan.created_by
        rx1 = TreatmentPrescription.objects.create(
            created_by=user,
            updated_by=user,
            treatment_plan=self.treatment_plan,
            project_area=self.project_area,
            type=TreatmentPrescriptionType.SINGLE,
            action=TreatmentPrescriptionAction.HEAVY_THINNING_BIOMASS,
            stand=self.stand1,
            geometry=self.stand1.geometry,
        )

        self.assertEqual(TreatmentPrescription.objects.all().count(), 1)

        results = upsert_treatment_prescriptions(
            treatment_plan=self.treatment_plan,
            project_area=self.project_area,
            stands=[self.stand1],
            action=TreatmentPrescriptionAction.HEAVY_THINNING_BURN,
            created_by=user,
        )

        self.assertEqual(TreatmentPrescription.objects.all().count(), 1)
        self.assertEqual(rx1.pk, results[0].pk)

    def test_upsert_creates_new_prescription(self):
        user = self.treatment_plan.created_by
        rx1 = TreatmentPrescription.objects.create(
            created_by=user,
            updated_by=user,
            treatment_plan=self.treatment_plan,
            project_area=self.project_area,
            type=TreatmentPrescriptionType.SINGLE,
            action=TreatmentPrescriptionAction.HEAVY_THINNING_BIOMASS,
            stand=self.stand1,
            geometry=self.stand1.geometry,
        )

        self.assertEqual(TreatmentPrescription.objects.all().count(), 1)

        results = upsert_treatment_prescriptions(
            treatment_plan=self.treatment_plan,
            project_area=self.project_area,
            stands=[self.stand2],
            action=TreatmentPrescriptionAction.HEAVY_THINNING_BURN,
            created_by=user,
        )

        self.assertEqual(TreatmentPrescription.objects.all().count(), 2)
        self.assertNotEqual(rx1.pk, results[0].pk)


class CloneTreatmentPlanTest(TransactionTestCase):
    def setUp(self):
        self.treatment_plan = TreatmentPlanFactory.create()
        self.project_area = ProjectAreaFactory.create(
            scenario=self.treatment_plan.scenario
        )
        self.stand1 = StandFactory.create()
        self.stand2 = StandFactory.create()
        self.stand3 = StandFactory.create()
        for stand in [self.stand1, self.stand2, self.stand3]:
            self.prescriptions = TreatmentPrescriptionFactory.create(
                **{
                    "treatment_plan": self.treatment_plan,
                    "project_area": self.project_area,
                    "stand": stand,
                    "geometry": self.stand1.geometry,
                },
            )

    def test_clone_treatment_plan(self):
        new_plan, new_prescriptions = clone_treatment_plan(
            self.treatment_plan,
            self.treatment_plan.created_by,
        )

        self.assertEqual(TreatmentPlan.objects.all().count(), 2)
        self.assertEqual(TreatmentPrescription.objects.all().count(), 6)
        self.assertNotEqual(new_plan.pk, self.treatment_plan.pk)


class SummaryTest(TransactionTestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create(
            configuration={"stand_size": StandSizeChoices.SMALL}
        )
        self.tx_plan = TreatmentPlanFactory.create(scenario=self.scenario)
        self.proj1 = ProjectAreaFactory(scenario=self.tx_plan.scenario)
        self.proj2 = ProjectAreaFactory(scenario=self.tx_plan.scenario)
        self.proj3 = ProjectAreaFactory(scenario=self.tx_plan.scenario)
        self.presc1 = TreatmentPrescriptionFactory.create_batch(
            size=4,
            treatment_plan=self.tx_plan,
            project_area=self.proj1,
            action=TreatmentPrescriptionAction.HEAVY_MASTICATION,
            stand__size=StandSizeChoices.SMALL,
        )
        self.presc2 = TreatmentPrescriptionFactory.create_batch(
            size=5,
            treatment_plan=self.tx_plan,
            project_area=self.proj2,
            action=TreatmentPrescriptionAction.HEAVY_THINNING_BIOMASS,
            stand__size=StandSizeChoices.SMALL,
        )
        self.presc3 = TreatmentPrescriptionFactory.create_batch(
            size=5,
            treatment_plan=self.tx_plan,
            project_area=self.proj3,
            action=TreatmentPrescriptionAction.MODERATE_MASTICATION_PLUS_RX_FIRE,
            stand__size=StandSizeChoices.SMALL,
        )

    def test_summary_is_returned_correctly(self):
        summary = generate_summary(self.tx_plan, project_area=None)
        self.assertIsNotNone(summary)
        self.assertIn("planning_area_id", summary)
        self.assertIn("planning_area_name", summary)
        self.assertIn("project_areas", summary)
        self.assertIn("scenario_id", summary)
        self.assertIn("scenario_name", summary)
        self.assertIn("treatment_plan_id", summary)
        self.assertIn("treatment_plan_name", summary)
        self.assertIn("extent", summary)
        self.assertEqual(len(summary["project_areas"]), 3)

        proj_area_1 = list(
            filter(
                lambda x: x["project_area_id"] == self.proj1.id,
                summary["project_areas"],
            )
        )[0]
        proj_area_2 = list(
            filter(
                lambda x: x["project_area_id"] == self.proj2.id,
                summary["project_areas"],
            )
        )[0]
        proj_area_3 = list(
            filter(
                lambda x: x["project_area_id"] == self.proj3.id,
                summary["project_areas"],
            )
        )[0]
        self.assertIn("prescriptions", proj_area_1)
        self.assertIn("centroid", proj_area_1)
        self.assertIn("type", proj_area_1.get("centroid"))
        self.assertIn("coordinates", proj_area_1.get("centroid"))
        self.assertIn("extent", proj_area_1)
        self.assertEqual(len(proj_area_1["prescriptions"]), 1)
        stands1 = proj_area_1["prescriptions"][0]["stand_ids"]
        self.assertGreater(len(stands1), 0)
        self.assertIn("prescriptions", proj_area_2)
        self.assertIn("centroid", proj_area_2)
        self.assertIn("extent", proj_area_2)
        self.assertEqual(len(proj_area_2["prescriptions"]), 1)

        self.assertIn("prescriptions", proj_area_3)
        self.assertIn("centroid", proj_area_3)
        self.assertIn("extent", proj_area_3)
        self.assertEqual(len(proj_area_3["prescriptions"]), 1)

    def test_summary_is_returned_correctly_filter_by_project_area(self):
        summary = generate_summary(self.tx_plan, project_area=self.proj1)
        self.assertIsNotNone(summary)
        self.assertIn("planning_area_id", summary)
        self.assertIn("planning_area_name", summary)
        self.assertIn("project_areas", summary)
        self.assertIn("scenario_id", summary)
        self.assertIn("scenario_name", summary)
        self.assertIn("treatment_plan_id", summary)
        self.assertIn("treatment_plan_name", summary)
        self.assertIn("extent", summary)
        self.assertEqual(len(summary["project_areas"]), 1)
        proj_area_1 = list(
            filter(
                lambda x: x["project_area_id"] == self.proj1.id,
                summary["project_areas"],
            )
        )[0]
        proj_area_2 = list(
            filter(
                lambda x: x["project_area_id"] == self.proj2.id,
                summary["project_areas"],
            )
        )
        proj_area_3 = list(
            filter(
                lambda x: x["project_area_id"] == self.proj3.id,
                summary["project_areas"],
            )
        )
        self.assertIn("prescriptions", proj_area_1)
        self.assertEqual(len(proj_area_1["prescriptions"]), 1)
        self.assertEqual(proj_area_2, [])
        self.assertEqual(proj_area_3, [])


class GetCalculationMatrixTest(TransactionTestCase):
    def test_matrix_returns_correctly(self):
        years = [1, 2]
        plan = TreatmentPlanFactory.create()
        s1 = StandFactory.create()
        s2 = StandFactory.create()
        s3 = StandFactory.create()
        TreatmentPrescriptionFactory.create(treatment_plan=plan, stand=s1)
        TreatmentPrescriptionFactory.create(treatment_plan=plan, stand=s2)
        TreatmentPrescriptionFactory.create(treatment_plan=plan, stand=s3)

        matrix = get_calculation_matrix(plan, years=years)
        self.assertIsNotNone(matrix)

        # impact variables * years * actions
        total_records = 15 * len(years) * 3
        self.assertEqual(len(matrix), total_records)


class CalculateImpactsTest(TransactionTestCase):
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

    @mock.patch(
        "impacts.services.ImpactVariable.get_impact_raster_path",
        return_value="impacts/tests/test_data/test_raster.tif",
    )
    @mock.patch(
        "impacts.services.ImpactVariable.get_baseline_raster_path",
        return_value="impacts/tests/test_data/test_raster.tif",
    )
    def test_calculate_impacts_returns_data(
        self, _get_impact_raster_path, _get_baseline_raster_path
    ):
        """Test that this function is performing work correctly. we don't
        really care about the returned values right now, only that it works.
        """
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        action = TreatmentPrescriptionAction.HEAVY_MASTICATION
        zonal = calculate_impacts(self.plan, variable, action, 2024)
        self.assertIsNotNone(zonal)
        for f in zonal:
            mean = f.get("properties", {}).get("mean")
            self.assertIsNotNone(mean)
            self.assertGreater(mean, 0)

    def test_calculate_impacts_bad_year_throws(self):
        """Test that this function is performing work correctly. we don't
        really care about the returned values right now, only that it works.
        """
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        action = TreatmentPrescriptionAction.HEAVY_MASTICATION
        with self.assertRaises(ValueError):
            calculate_impacts(self.plan, variable, action, 1)


class AsyncCalculatePersistImpactsTestCase(TransactionTestCase):
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

    @mock.patch(
        "impacts.services.ImpactVariable.get_impact_raster_path",
        return_value="impacts/tests/test_data/test_raster.tif",
    )
    @mock.patch(
        "impacts.services.ImpactVariable.get_baseline_raster_path",
        return_value="impacts/tests/test_data/test_raster.tif",
    )
    def test_calculate_impacts_returns_data(
        self, _get_impact_raster, _get_baseline_raster
    ):
        """Test that this function is performing work correctly. we don't
        really care about the returned values right now, only that it works.
        """
        with self.settings(
            CELERY_ALWAYS_EAGER=True,
            CELERY_TASK_STORE_EAGER_RESULT=True,
            CELERY_TASK_IGNORE_RESULT=False,
        ):
            self.assertEquals(TreatmentResult.objects.count(), 0)
            matrix = get_calculation_matrix(self.plan)
            variable, action, year = matrix[0]
            result = async_get_or_calculate_persist_impacts(
                self.plan.pk, variable, action, year
            )
            self.assertIsNotNone(result)
            self.assertGreater(TreatmentResult.objects.count(), 0)
            self.assertEquals(len(self.stands), TreatmentResult.objects.count())
