import json
import random
from pathlib import Path

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.db.models import Union
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.test import TransactionTestCase
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from stands.models import STAND_AREA_ACRES, Stand, StandSizeChoices
from stands.tests.factories import StandFactory

from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    ImpactVariableAggregation,
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
    TreatmentPrescriptionType,
    TreatmentResult,
)
from impacts.services import (
    calculate_delta,
    calculate_impacts,
    calculate_impacts_for_untreated_stands,
    classify_flame_length,
    classify_rate_of_spread,
    clone_treatment_plan,
    export_geopackage,
    fetch_treatment_plan_data,
    generate_impact_results_data_to_plot,
    generate_summary,
    get_calculation_matrix,
    get_calculation_matrix_wo_action,
    itertools,
    upsert_treatment_prescriptions,
)
from impacts.tests.factories import (
    ProjectAreaTreatmentResultFactory,
    TreatmentPlanFactory,
    TreatmentPrescriptionFactory,
    TreatmentResultFactory,
)
from planscape.tests.factories import UserFactory


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
        self.stand_area = STAND_AREA_ACRES[StandSizeChoices.SMALL]

    def test_summary_is_returned_correctly(self):
        summary = generate_summary(self.tx_plan, project_area=None)
        self.assertIsNotNone(summary)
        self.assertIn("planning_area_id", summary)
        self.assertIn("planning_area_name", summary)
        self.assertIn("prescriptions", summary)
        self.assertIn("project_areas", summary)
        self.assertIn("scenario_id", summary)
        self.assertIn("scenario_name", summary)
        self.assertIn("treatment_plan_id", summary)
        self.assertIn("treatment_plan_name", summary)
        self.assertIn("total_stand_count", summary)
        self.assertIn("total_area_acres", summary)
        self.assertIn("total_treated_stand_count", summary)
        self.assertIn("total_treated_area_acres", summary)
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
        self.assertIn("total_stand_count", proj_area_1)
        self.assertIn("total_area_acres", proj_area_1)
        self.assertIn("total_treated_stand_count", proj_area_1)
        self.assertIn("total_treated_area_acres", proj_area_1)
        self.assertEqual(len(proj_area_1["prescriptions"]), 1)
        stands1 = proj_area_1["prescriptions"][0]["stand_ids"]
        self.assertGreater(len(stands1), 0)

        self.assertIn("prescriptions", proj_area_2)
        self.assertIn("centroid", proj_area_2)
        self.assertIn("extent", proj_area_2)
        self.assertIn("total_stand_count", proj_area_2)
        self.assertIn("total_area_acres", proj_area_2)
        self.assertIn("total_treated_stand_count", proj_area_2)
        self.assertIn("total_treated_area_acres", proj_area_2)
        self.assertEqual(len(proj_area_2["prescriptions"]), 1)

        self.assertIn("prescriptions", proj_area_3)
        self.assertIn("centroid", proj_area_3)
        self.assertIn("extent", proj_area_3)
        self.assertIn("total_stand_count", proj_area_3)
        self.assertIn("total_area_acres", proj_area_3)
        self.assertIn("total_treated_stand_count", proj_area_3)
        self.assertIn("total_treated_area_acres", proj_area_3)
        self.assertEqual(len(proj_area_3["prescriptions"]), 1)

        precription_1 = list(
            filter(
                lambda x: x["action"] == TreatmentPrescriptionAction.HEAVY_MASTICATION,
                summary["prescriptions"],
            )
        )[0]
        precription_2 = list(
            filter(
                lambda x: x["action"]
                == TreatmentPrescriptionAction.HEAVY_THINNING_BIOMASS,
                summary["prescriptions"],
            )
        )[0]
        precription_3 = list(
            filter(
                lambda x: x["action"]
                == TreatmentPrescriptionAction.MODERATE_MASTICATION_PLUS_RX_FIRE,
                summary["prescriptions"],
            )
        )[0]

        self.assertEqual(precription_1["stand_count"], 4)
        self.assertEqual(precription_1["area_acres"], 4 * self.stand_area)
        self.assertAlmostEqual(precription_1["area_percent"], 9.52, places=2)

        self.assertEqual(precription_2["stand_count"], 5)
        self.assertEqual(precription_2["area_acres"], 5 * self.stand_area)
        self.assertAlmostEqual(precription_2["area_percent"], 11.9, places=2)

        self.assertEqual(precription_3["stand_count"], 5)
        self.assertEqual(precription_3["area_acres"], 5 * self.stand_area)
        self.assertAlmostEqual(precription_3["area_percent"], 11.9, places=2)

    def test_summary_is_returned_correctly_filter_by_project_area(self):
        summary = generate_summary(self.tx_plan, project_area=self.proj1)
        self.assertIsNotNone(summary)
        self.assertIn("planning_area_id", summary)
        self.assertIn("planning_area_name", summary)
        self.assertIn("prescriptions", summary)
        self.assertIn("project_areas", summary)
        self.assertIn("scenario_id", summary)
        self.assertIn("scenario_name", summary)
        self.assertIn("treatment_plan_id", summary)
        self.assertIn("treatment_plan_name", summary)
        self.assertIn("total_stand_count", summary)
        self.assertIn("total_area_acres", summary)
        self.assertIn("total_treated_stand_count", summary)
        self.assertIn("total_treated_area_acres", summary)
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

        self.assertEquals(len(summary["prescriptions"]), 1)
        precription = summary["prescriptions"][0]

        self.assertEqual(precription["stand_count"], 4)
        self.assertEqual(precription["area_acres"], 4 * self.stand_area)
        self.assertAlmostEqual(precription["area_percent"], 28.57, places=2)


class GetCalculationMatrixTest(TransactionTestCase):
    def test_calculation_matrix_returns_correctly(self):
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
        total_records = len(list(ImpactVariable)) * len(years) * 3
        self.assertEqual(len(matrix), total_records)


class GetCalculationMetricsWoActionTest(TransactionTestCase):
    def test_calculation_matrix_wo_action_returns_correctly(self):
        years = [1, 2]
        matrix = get_calculation_matrix_wo_action(years=years)

        total_records = len(list(ImpactVariable)) * len(years)

        self.assertEqual(len(matrix), total_records)

    def test_calculation_matrix_wo_action_null_years(self):
        matrix = get_calculation_matrix_wo_action()

        total_records = len(list(ImpactVariable)) * len(AVAILABLE_YEARS)

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
                    "variable": str(ImpactVariable.CANOPY_BASE_HEIGHT).upper(),
                    "action": None,
                    "baseline": True,
                }
            }
        }
        action_metadata = {
            "modules": {
                "impacts": {
                    "year": 2024,
                    "variable": str(ImpactVariable.CANOPY_BASE_HEIGHT).upper(),
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
            # non-burnable
            (None, None, None),
            # non-forested
            (1, None, 0),
            # value = 0 -> non-forested
            (0, 1, 0),
            # baseline = 0 -> non-forested
            (1, 0, 0),
            (1, 1, 0),
            (2, 1, 1),
            (1.5, 1, 0.5),
            (40, 20, 1),
        ]

        for value, base, expected_result in values_bases_expected_results:
            self.assertEqual(
                calculate_delta(value=value, baseline=base), expected_result
            )


class CalculateImpactsForUntreatedStandsTest(TransactionTestCase):
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
        self.treated_stands = self.stands[:3]
        self.prescriptions = list(
            [
                TreatmentPrescriptionFactory.create(
                    treatment_plan=self.plan,
                    stand=stand,
                    action=TreatmentPrescriptionAction.HEAVY_MASTICATION,
                    geometry=stand.geometry,
                )
                for stand in self.treated_stands
            ]
        )
        baseline_metadata = {
            "modules": {
                "impacts": {
                    "year": AVAILABLE_YEARS[0],
                    "variable": ImpactVariable.CANOPY_BASE_HEIGHT,
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

    def test_calculate_impacts_for_untreated_stands(self):
        treatment_results = calculate_impacts_for_untreated_stands(
            self.plan, ImpactVariable.CANOPY_BASE_HEIGHT, year=AVAILABLE_YEARS[0]
        )

        self.assertIsNotNone(treatment_results)
        self.assertEqual(
            TreatmentResult.objects.count(),
            self.project_area.get_stands().count() - len(self.treated_stands),
        )

        for treatment_result in TreatmentResult.objects.all():
            self.assertEqual(
                treatment_result.variable, ImpactVariable.CANOPY_BASE_HEIGHT
            )
            self.assertEqual(treatment_result.action, None)
            self.assertEqual(treatment_result.value, treatment_result.baseline)
            self.assertEqual(treatment_result.delta, 0)


class ImpactResultsDataPlotTest(TransactionTestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={"stand_size": StandSizeChoices.SMALL},
        )
        self.project_areas = [
            ProjectAreaFactory.create(scenario=self.scenario),
            ProjectAreaFactory.create(scenario=self.scenario),
            ProjectAreaFactory.create(scenario=self.scenario),
        ]
        self.tx_plan = TreatmentPlanFactory.create(
            scenario=self.scenario, created_by=self.user
        )
        self.empty_tx_plan = TreatmentPlanFactory.create(
            scenario=self.scenario, created_by=self.user
        )
        self.years = AVAILABLE_YEARS
        self.patxrx_list = []
        for pa in self.project_areas:
            for variable in ImpactVariable.choices:
                for year in self.years:
                    ProjectAreaTreatmentResultFactory(
                        project_area=pa,
                        treatment_plan=self.tx_plan,
                        variable=variable[0],
                        year=year,
                        aggregation=ImpactVariableAggregation.MEAN,
                        action=TreatmentPrescriptionAction.MODERATE_THINNING_BIOMASS,
                    )

    def test_generate_data_to_plot(self):
        input_variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        data = generate_impact_results_data_to_plot(
            treatment_plan=self.tx_plan,
            impact_variables=input_variables,
        )
        self.assertIsNotNone(data)
        self.assertEqual(len(data), len(self.years) * len(input_variables))
        for item in data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), input_variables)
            self.assertIsNotNone(item.get("value"))
            self.assertIsNotNone(item.get("baseline"))
            self.assertIsNotNone(item.get("delta"))
            self.assertIsNotNone(item.get("relative_year"))
            self.assertIsNone(item.get("value_dividend"))
            self.assertIsNone(item.get("baseline_dividend"))
            self.assertIsNone(item.get("sum_baselines"))
            self.assertIsNone(item.get("divisor"))

    def test_generate_data_to_plot__filter_by_project_areas(self):
        pa_pks = [project_area.pk for project_area in self.project_areas]
        pa_pks.pop(0)
        pa_pks.sort()

        input_variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        data = generate_impact_results_data_to_plot(
            treatment_plan=self.tx_plan,
            impact_variables=input_variables,
            project_area_pks=pa_pks,
        )
        self.assertIsNotNone(data)
        self.assertEqual(len(data), len(self.years) * len(input_variables))
        for item in data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), input_variables)
            self.assertIsNotNone(item.get("value"))
            self.assertIsNotNone(item.get("baseline"))
            self.assertIsNotNone(item.get("delta"))
            self.assertIsNotNone(item.get("relative_year"))
            self.assertIsNone(item.get("value_dividend"))
            self.assertIsNone(item.get("baseline_dividend"))
            self.assertIsNone(item.get("sum_baselines"))
            self.assertIsNone(item.get("divisor"))

    def test_generate_data_to_plot__filter_by_actions(self):
        input_variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        actions = [TreatmentPrescriptionAction.MODERATE_THINNING_BIOMASS.value]
        data = generate_impact_results_data_to_plot(
            treatment_plan=self.tx_plan,
            impact_variables=input_variables,
            tx_px_actions=actions,
        )
        self.assertIsNotNone(data)
        self.assertEqual(len(data), len(self.years) * len(input_variables))
        for item in data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), input_variables)
            self.assertIsNotNone(item.get("value"))
            self.assertIsNotNone(item.get("baseline"))
            self.assertIsNotNone(item.get("delta"))
            self.assertIsNotNone(item.get("relative_year"))
            self.assertIsNone(item.get("value_dividend"))
            self.assertIsNone(item.get("baseline_dividend"))
            self.assertIsNone(item.get("sum_baselines"))
            self.assertIsNone(item.get("divisor"))

    def test_empty_results(self):
        input_variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        data = generate_impact_results_data_to_plot(
            treatment_plan=self.empty_tx_plan,
            impact_variables=input_variables,
        )
        self.assertEqual(data, [])

    def test_project_area_with_no_treatment(self):
        new_project_area = ProjectAreaFactory.create(scenario=self.scenario)
        self.project_areas.append(new_project_area)
        for variable in ImpactVariable.choices:
            for year in self.years:
                ProjectAreaTreatmentResultFactory(
                    project_area=new_project_area,
                    treatment_plan=self.tx_plan,
                    variable=variable[0],
                    year=year,
                    aggregation=ImpactVariableAggregation.MEAN,
                    action=None,
                    stand_count=0,
                    value=0,
                    baseline=0,
                    delta=0,
                )

        input_variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        data = generate_impact_results_data_to_plot(
            treatment_plan=self.tx_plan,
            impact_variables=input_variables,
            project_area_pks=[new_project_area.pk],
        )
        self.assertIsNotNone(data)
        self.assertEqual(len(data), len(self.years) * len(input_variables))
        for item in data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), input_variables)
            self.assertIsNone(item.get("value"))
            self.assertIsNone(item.get("baseline"))
            self.assertIsNone(item.get("delta"))
            self.assertIsNotNone(item.get("relative_year"))


class ClassificationFunctionsTest(TransactionTestCase):
    def test_classify_flame_length(self):
        """
        Checks the numeric boundaries for flame length classification.
        """
        self.assertEqual(classify_flame_length(10.0), "Very Low")
        self.assertEqual(classify_flame_length(40.0), "Low")
        self.assertEqual(classify_flame_length(41.0), "Moderate")
        self.assertEqual(classify_flame_length(80.0), "Moderate")
        self.assertEqual(classify_flame_length(80.1), "High")
        self.assertEqual(classify_flame_length(120.0), "High")
        self.assertEqual(classify_flame_length(120.1), "Very High")
        self.assertEqual(classify_flame_length(250.0), "Very High")
        self.assertEqual(classify_flame_length(260.0), "Extreme")

    def test_classify_rate_of_spread(self):
        """
        Checks the numeric boundaries for rate of spread classification.
        """
        self.assertEqual(classify_rate_of_spread(20.0), "Very Low")
        self.assertEqual(classify_rate_of_spread(50.0), "Low")
        self.assertEqual(classify_rate_of_spread(51.0), "Moderate")
        self.assertEqual(classify_rate_of_spread(500.0), "High")
        self.assertEqual(classify_rate_of_spread(501.0), "Very High")
        self.assertEqual(classify_rate_of_spread(1500.1), "Extreme")


class FetchTreatmentPlanDataTest(TransactionTestCase):
    def test_fetch_treatment_plan_data_returns_results(self):
        treatment_plan = TreatmentPlanFactory.create()
        _ = ProjectAreaFactory.create(scenario=treatment_plan.scenario)
        variables = [ImpactVariable.CANOPY_BASE_HEIGHT, ImpactVariable.CANOPY_COVER]
        years = [2024, 2029]
        stand1 = StandFactory.create()
        stand2 = StandFactory.create()
        calcs = itertools.product(variables, years, [stand1, stand2])
        for variable, year, stand in calcs:
            TreatmentResultFactory.create(
                treatment_plan=treatment_plan,
                variable=variable,
                year=year,
                value=random.randrange(0, 100),
                baseline=random.randrange(0, 100),
                delta=random.randrange(0, 100),
                stand=stand,
            )

        data = fetch_treatment_plan_data(treatment_plan)
        self.assertEqual(len(data), 2)
        stand_ids = [x.get("properties", {}).get("stand_id") for x in data]
        self.assertIn(stand1.pk, stand_ids)
        self.assertIn(stand2.pk, stand_ids)


class ExportShapefileTest(TransactionTestCase):
    def test_export_creates_file(self):
        treatment_plan = TreatmentPlanFactory.create()
        _ = ProjectAreaFactory.create(scenario=treatment_plan.scenario)
        variables = [ImpactVariable.CANOPY_BASE_HEIGHT, ImpactVariable.CANOPY_COVER]
        years = [2024, 2029]
        stand1 = StandFactory.create()
        stand2 = StandFactory.create()
        calcs = itertools.product(variables, years, [stand1, stand2])
        for variable, year, stand in calcs:
            TreatmentResultFactory.create(
                treatment_plan=treatment_plan,
                variable=variable,
                year=year,
                value=random.randrange(0, 100),
                baseline=random.randrange(0, 100),
                delta=random.randrange(0, 100),
                stand=stand,
            )

        shapefile = export_geopackage(treatment_plan)
        path = Path(shapefile)
        self.assertTrue(path.exists())
