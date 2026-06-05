from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from stands.models import Stand, StandMetric, StandSizeChoices

from funding_report.models import (
    FUNDING_REPORT_ACTION,
    FUNDING_REPORT_AGGREGATION,
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingReportMetric,
)
from funding_report.services import calculate_funding_opportunity_report


class CalculateFundingOpportunityReportTest(TestCase):
    def setUp(self):
        self.stand = Stand.objects.create(
            geometry=Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)), srid=4269),
            size=StandSizeChoices.LARGE,
            area_m2=1,
        )
        self.small_stand = Stand.objects.create(
            geometry=Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)), srid=4269),
            size=StandSizeChoices.SMALL,
            area_m2=1,
        )
        geometry = MultiPolygon(self.stand.geometry)
        self.planning_area = PlanningAreaFactory.create(
            with_stands=False,
            geometry=geometry,
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={"stand_size": StandSizeChoices.LARGE},
        )
        self.project_area = ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=geometry,
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
        )

        for metric in FundingReportMetric:
            for year in FUNDING_REPORT_YEARS:
                baseline_layer = self.create_datalayer(metric, year, baseline=True)
                changed_layer = self.create_datalayer(metric, year, baseline=False)
                StandMetric.objects.create(
                    stand=self.stand,
                    datalayer=baseline_layer,
                    avg=10,
                )
                StandMetric.objects.create(
                    stand=self.stand,
                    datalayer=changed_layer,
                    avg=15,
                    count=3960,
                )

    def create_datalayer(self, metric, year, baseline):
        return DataLayerFactory.create(
            name=f"{'Baseline' if baseline else 'Legalmax'} {year} {metric.value}",
            type=DataLayerType.RASTER,
            metadata={
                "modules": {
                    "funding_report": {
                        "year": year,
                        "variable": metric.value,
                        "baseline": baseline,
                    }
                }
            },
        )

    def test_calculates_results_and_respects_scenario_stand_size(self):
        results = calculate_funding_opportunity_report(self.report)

        self.assertEqual(results["stand_size"], StandSizeChoices.LARGE)
        self.assertNotIn("metrics", results)
        stand_result = next(
            result
            for result in results["stand_results"]
            if result["variable"] == FundingReportMetric.ABOVEGROUND_TOTAL
            and result["year"] == 2026
        )
        self.assertEqual(stand_result["stand_id"], self.stand.pk)
        self.assertEqual(stand_result["action"], FUNDING_REPORT_ACTION)
        self.assertEqual(stand_result["aggregation"], FUNDING_REPORT_AGGREGATION)
        self.assertEqual(stand_result["baseline"], 10)
        self.assertEqual(stand_result["value"], 15)
        self.assertEqual(stand_result["delta"], 0.5)
        self.assertNotIn("forested_rate", stand_result)

        project_area_result = next(
            result
            for result in results["project_area_results"]
            if result["variable"] == FundingReportMetric.ABOVEGROUND_TOTAL
            and result["year"] == 2026
        )
        self.assertEqual(project_area_result["project_area_id"], self.project_area.pk)
        self.assertEqual(project_area_result["action"], FUNDING_REPORT_ACTION)
        self.assertEqual(project_area_result["aggregation"], FUNDING_REPORT_AGGREGATION)
        self.assertEqual(project_area_result["baseline"], 10)
        self.assertEqual(project_area_result["value"], 15)
        self.assertEqual(project_area_result["delta"], 0.5)
        self.assertEqual(project_area_result["stand_count"], 1)

        self.report.refresh_from_db()
        self.assertEqual(self.report.results, results)
