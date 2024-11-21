import json
from unittest import mock
from django.test import TransactionTestCase
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.contrib.gis.db.models import Union
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from impacts.models import (
    ImpactVariable,
    ProjectAreaTreatmentResult,
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
    TreatmentPrescriptionType,
    TreatmentResult,
    TreatmentResultType,
)
from impacts.services import (
    calculate_delta,
    calculate_impacts,
    clone_treatment_plan,
    get_calculation_matrix,
    upsert_treatment_prescriptions,
    generate_summary,
)
from impacts.tasks import (
    async_calculate_impacts_for_variable_action_year,
    async_calculate_persist_impacts_treatment_plan,
)
from impacts.tests.factories import (
    TreatmentPlanFactory,
    TreatmentPrescriptionFactory,
    TreatmentResultFactory,
)
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
        total_records = 17 * len(years) * 3
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

    def test_calculate_impacts_returns_data(
        self,
    ):
        """Test that this function is performing work correctly. we don't
        really care about the returned values right now, only that it works.
        """
        baseline_metadata = {
            "modules": {
                "impacts": {
                    "year": 2024,
                    "variable": ImpactVariable.CANOPY_BASE_HEIGHT,
                    "action": None,
                    "baseline": True,
                }
            }
        }
        action_metadata = {
            "modules": {
                "impacts": {
                    "year": 2024,
                    "variable": ImpactVariable.CANOPY_BASE_HEIGHT,
                    "action": TreatmentPrescriptionAction.get_file_mapping(
                        TreatmentPrescriptionAction.HEAVY_MASTICATION
                    ),
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
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        action = TreatmentPrescriptionAction.HEAVY_MASTICATION
        stand_results, project_area_results = calculate_impacts(
            self.plan, variable, action, 2024
        )
        self.assertIsNotNone(stand_results)
        self.assertIsNotNone(project_area_results)

    def test_calculate_impacts_bad_year_throws(self):
        """Test that this function is performing work correctly. we don't
        really care about the returned values right now, only that it works.
        """
        variable = ImpactVariable.CANOPY_BASE_HEIGHT
        action = TreatmentPrescriptionAction.HEAVY_MASTICATION
        with self.assertRaises(ValueError):
            calculate_impacts(self.plan, variable, action, 1)

    def test_calculate_delta(self):
        values_bases_expected_results = [
            (0, 0, -1),
            (0, 1, -1),
            (1, 0, 0),
            (1, 1, 0),
            (2, 1, 1),
            (1.5, 1, 0.5),
            (40, 20, 1),
            (None, 1, -1),
            (1, None, 0),
            (None, None, -1),
        ]

        for value, base, expected_result in values_bases_expected_results:
            assert calculate_delta(value=value, baseline=base) == expected_result


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
            self.assertEquals(len(self.stands), TreatmentResult.objects.count())


class GenerateShapefileTest(TransactionTestCase):
    def setUp(self):
        self.treatment_plan = TreatmentPlanFactory.create()
        self.stand = StandFactory.create()
        self.project_area = ProjectAreaFactory.create(scenario=self.treatment_plan.scenario)
        self.treatment_prescription = TreatmentPrescriptionFactory.create(
            treatment_plan=self.treatment_plan,
            project_area=self.project_area,
            stand=self.stand,
        )

    @mock.patch("impacts.services.fetch_treatment_plan_data")
    @mock.patch("impacts.services.fiona.open")
    @mock.patch("impacts.services.zipfile.ZipFile")
    def test_generate_shapefile_success(
        self, mock_zipfile, mock_fiona_open, mock_fetch_data
    ):
        """
        Test successful shapefile generation and zipping.
        """
        mock_fetch_data.return_value = [
            {
                "wkt_geom": "POLYGON((...))",
                "action": "Heavy Thinning",
                "id": self.stand.id,
                "project_area_name": self.project_area.name,
                "treatment_plan_id": self.treatment_plan.id,
            }
        ]
        mock_fiona_open.return_value.__enter__.return_value.write = mock.Mock()

        zip_path = generate_shapefile_for_treatment_plan(self.treatment_plan)

        self.assertIn("treatment_plan", zip_path)
        mock_fetch_data.assert_called_once_with(self.treatment_plan.id)
        mock_fiona_open.assert_called_once()
        mock_zipfile.assert_called_once()

    @mock.patch("impacts.services.fetch_treatment_plan_data")
    def test_generate_shapefile_no_data(self, mock_fetch_data):
        """
        Test shapefile generation when no data is returned.
        """
        mock_fetch_data.return_value = []
        with self.assertRaises(ValueError):
            generate_shapefile_for_treatment_plan(self.treatment_plan)

    @mock.patch("impacts.services.fetch_treatment_plan_data")
    def test_generate_shapefile_error(self, mock_fetch_data):
        """
        Test shapefile generation when an exception is raised.
        """
        mock_fetch_data.side_effect = Exception("Mocked error")
        with self.assertRaises(Exception):
            generate_shapefile_for_treatment_plan(self.treatment_plan)
