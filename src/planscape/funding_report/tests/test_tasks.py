from unittest import mock

from django.test import TestCase
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planscape.tests.factories import UserFactory

from funding_report.models import (
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
)
from funding_report.tasks import run_funding_opportunity_report


class RunFundingOpportunityReportTaskTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
        )

    @mock.patch("funding_report.tasks.chord")
    @mock.patch("funding_report.services.get_funding_report_calculation_datalayers")
    def test_task_builds_metric_graph(self, datalayers_mock, chord_mock):
        datalayers_mock.return_value = [mock.Mock(pk=1), mock.Mock(pk=2)]

        run_funding_opportunity_report(self.report.pk)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.RUNNING)
        chord_mock.assert_called_once()

    @mock.patch("funding_report.services.get_funding_report_calculation_datalayers")
    def test_task_sets_failed_on_exception(self, datalayers_mock):
        datalayers_mock.side_effect = ValueError("bad data")

        with self.assertRaises(ValueError):
            run_funding_opportunity_report(self.report.pk)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.FAILED)
