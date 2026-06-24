from datetime import timedelta
from unittest import mock

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from planscape.tests.factories import UserFactory

from funding_report.models import (
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
    FundingReportMetric,
)
from funding_report.tasks import (
    STALE_RUNNING_TIMEOUT,
    async_calculate_funding_report_delta,
    async_finalize_funding_report_results,
    async_send_email_funding_report_finished,
    run_funding_opportunity_report,
)


class FundingOpportunityReportTaskTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.project_area = ProjectAreaFactory.create(scenario=self.scenario)
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
        )

    def create_datalayer(self, metric, year, baseline):
        return DataLayerFactory.create(
            name=f"{'Baseline' if baseline else 'Legalmax'} {year} {metric.value}",
            type=DataLayerType.RASTER,
            url="s3://bucket/fake.tif",
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

    def create_all_datalayers(self):
        for metric in FundingReportMetric:
            for year in FUNDING_REPORT_YEARS:
                self.create_datalayer(metric, year, baseline=True)
                self.create_datalayer(metric, year, baseline=False)

    @mock.patch("funding_report.tasks.calculate_project_area_delta")
    def test_delta_task_returns_project_area_result(self, calculate_mock):
        baseline_layer = self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=True
        )
        value_layer = self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=False
        )
        calculate_mock.return_value = {
            "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
            "project_id": self.project_area.pk,
            "year": 2026,
            "value": 10,
            "baseline": 8,
            "delta": 1.2,
        }

        result = async_calculate_funding_report_delta(
            project_area_id=self.project_area.pk,
            baseline_layer_id=baseline_layer.pk,
            value_layer_id=value_layer.pk,
            year=2026,
            metric=FundingReportMetric.ABOVEGROUND_TOTAL.value,
        )

        self.assertEqual(result, calculate_mock.return_value)
        calculate_mock.assert_called_once_with(
            project_area=self.project_area,
            metric=FundingReportMetric.ABOVEGROUND_TOTAL.value,
            year=2026,
            datalayer_lookup={
                (
                    FundingReportMetric.ABOVEGROUND_TOTAL.value,
                    2026,
                    True,
                ): baseline_layer,
                (FundingReportMetric.ABOVEGROUND_TOTAL.value, 2026, False): value_layer,
            },
        )

    @mock.patch("funding_report.tasks.calculate_project_area_delta")
    def test_delta_task_returns_error_marker_on_failure(self, calculate_mock):
        baseline_layer = self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=True
        )
        value_layer = self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=False
        )
        calculate_mock.side_effect = ValueError("boom")

        result = async_calculate_funding_report_delta(
            project_area_id=self.project_area.pk,
            baseline_layer_id=baseline_layer.pk,
            value_layer_id=value_layer.pk,
            year=2026,
            metric=FundingReportMetric.ABOVEGROUND_TOTAL.value,
        )

        self.assertEqual(
            result,
            {
                "error": "boom",
                "project_id": self.project_area.pk,
                "proj_id": None,
                "variable": FundingReportMetric.ABOVEGROUND_TOTAL.value,
                "year": 2026,
            },
        )

    @mock.patch("funding_report.tasks.async_send_email_funding_report_finished.delay")
    def test_finalize_task_saves_results_and_success_status(self, email_task_mock):
        async_finalize_funding_report_results(
            project_results=[
                {
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
                    "project_id": self.project_area.pk,
                    "year": 2026,
                    "value": 10,
                    "baseline": 8,
                    "delta": 1.2,
                }
            ],
            funding_opportunity_report_id=self.report.pk,
        )

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.SUCCESS)
        email_task_mock.assert_called_once_with(self.report.pk)
        self.assertEqual(
            self.report.results,
            {
                "summary": {
                    FundingReportMetric.ABOVEGROUND_TOTAL: [
                        {"year": 2026, "value": 10, "baseline": 8, "delta": 25.0}
                    ]
                },
                "projects": {
                    FundingReportMetric.ABOVEGROUND_TOTAL: [
                        {
                            "project_id": self.project_area.pk,
                            "proj_id": None,
                            "year": 2026,
                            "value": 10,
                            "baseline": 8,
                            "delta": 1.2,
                        }
                    ]
                },
            },
        )

    @mock.patch("funding_report.tasks.async_send_email_funding_report_finished.delay")
    def test_finalize_task_sets_failed_status_with_errors(self, email_task_mock):
        async_finalize_funding_report_results(
            project_results=[
                {
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
                    "project_id": self.project_area.pk,
                    "year": 2026,
                    "value": 10,
                    "baseline": 8,
                    "delta": 1.2,
                },
                {
                    "error": "boom",
                    "project_id": self.project_area.pk,
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL.value,
                    "year": 2031,
                },
                None,
            ],
            funding_opportunity_report_id=self.report.pk,
        )

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.FAILED)
        email_task_mock.assert_not_called()
        self.assertEqual(
            self.report.results["errors"],
            [
                {
                    "error": "boom",
                    "project_id": self.project_area.pk,
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL.value,
                    "year": 2031,
                }
            ],
        )

    @mock.patch("funding_report.tasks.chord")
    def test_run_task_builds_delta_chord(self, chord_mock):
        self.create_all_datalayers()

        run_funding_opportunity_report(self.report.pk)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.RUNNING)
        chord_mock.assert_called_once()
        tasks = chord_mock.call_args.args[0]
        self.assertEqual(
            len(tasks),
            1 * len(FundingReportMetric) * len(FUNDING_REPORT_YEARS) + 4,
        )

    @mock.patch("funding_report.tasks.chord")
    def test_run_task_sets_failed_on_exception(self, chord_mock):
        self.create_all_datalayers()
        chord_mock.side_effect = ValueError("bad data")

        with self.assertRaises(ValueError):
            run_funding_opportunity_report(self.report.pk)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.FAILED)

    @mock.patch("funding_report.tasks.chord")
    def test_run_task_raises_for_missing_datalayer(self, chord_mock):
        with self.assertRaises(ValueError):
            run_funding_opportunity_report(self.report.pk)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.FAILED)
        chord_mock.assert_not_called()

    @mock.patch("funding_report.tasks.chord")
    def test_run_task_skips_recent_running_report(self, chord_mock):
        self.report.status = FundingOpportunityReportStatus.RUNNING
        self.report.save(update_fields=["status", "updated_at"])

        run_funding_opportunity_report(self.report.pk)

        chord_mock.assert_not_called()

    @mock.patch("funding_report.tasks.chord")
    def test_run_task_redispatches_stale_running_report(self, chord_mock):
        self.create_all_datalayers()
        self.report.status = FundingOpportunityReportStatus.RUNNING
        self.report.save(update_fields=["status", "updated_at"])
        FundingOpportunityReport.objects.filter(pk=self.report.pk).update(
            updated_at=timezone.now() - STALE_RUNNING_TIMEOUT - timedelta(minutes=1)
        )

        run_funding_opportunity_report(self.report.pk)

        chord_mock.assert_called_once()
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.RUNNING)

    @mock.patch("funding_report.tasks.send_mail")
    def test_send_email_funding_report_finished_sends_to_report_creator(
        self, send_mail_mock
    ):
        self.user.email = "planner@example.com"
        self.user.first_name = "Test"
        self.user.last_name = "Planner"
        self.user.save(update_fields=["email", "first_name", "last_name"])

        async_send_email_funding_report_finished(self.report.pk)

        send_mail_mock.assert_called_once()
        kwargs = send_mail_mock.call_args.kwargs
        self.assertEqual(kwargs["recipient_list"], ["planner@example.com"])
        self.assertEqual(kwargs["from_email"], settings.DEFAULT_FROM_EMAIL)
        self.assertIn("Funding Opportunity Report", kwargs["subject"])
        self.assertIn("message", kwargs)
        self.assertIn("html_message", kwargs)
