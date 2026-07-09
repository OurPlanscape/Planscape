from datetime import timedelta
from unittest import mock

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from planscape.tests.factories import UserFactory

from funding_report.models import (
    FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
    FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
    FLAME_LENGTH_REDUCTION_INTERVALS,
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingOpportunityReportRun,
    FundingOpportunityReportStatus,
    FundingReportMetric,
)
from funding_report.tasks import (
    STALE_RUNNING_TIMEOUT,
    async_calculate_funding_report_delta,
    async_finalize_funding_report_results,
    run_funding_opportunity_report,
    send_weekly_funding_report_users_report,
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
            from_ft=FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT,
            to_ft=FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT,
        )

    @mock.patch("funding_report.tasks.calculate_project_area_delta")
    def test_delta_task_threads_custom_interval_through(self, calculate_mock):
        baseline_layer = self.create_datalayer(
            FundingReportMetric.TOTAL_FLAME_SEVERITY, 2026, baseline=True
        )
        value_layer = self.create_datalayer(
            FundingReportMetric.TOTAL_FLAME_SEVERITY, 2026, baseline=False
        )
        calculate_mock.return_value = {
            "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY,
            "project_id": self.project_area.pk,
            "year": 2026,
            "value": 10,
            "baseline": 8,
            "delta": 1.2,
            "interval": {"from": 6.0, "to": 4.0},
        }

        result = async_calculate_funding_report_delta(
            project_area_id=self.project_area.pk,
            baseline_layer_id=baseline_layer.pk,
            value_layer_id=value_layer.pk,
            year=2026,
            metric=FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
            from_ft=6.0,
            to_ft=4.0,
        )

        self.assertEqual(result, calculate_mock.return_value)
        calculate_mock.assert_called_once_with(
            project_area=self.project_area,
            metric=FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
            year=2026,
            datalayer_lookup={
                (
                    FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
                    2026,
                    True,
                ): baseline_layer,
                (
                    FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
                    2026,
                    False,
                ): value_layer,
            },
            from_ft=6.0,
            to_ft=4.0,
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

    def test_finalize_task_saves_results_and_success_status(self):
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

    def test_finalize_task_buckets_flame_severity_by_interval(self):
        async_finalize_funding_report_results(
            project_results=[
                {
                    "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY,
                    "project_id": self.project_area.pk,
                    "year": 2026,
                    "value": 10,
                    "baseline": 40,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
                {
                    "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY,
                    "project_id": self.project_area.pk,
                    "year": 2026,
                    "value": 5,
                    "baseline": 40,
                    "delta": 12.5,
                    "interval": {"from": 6.0, "to": 4.0},
                },
                {
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
                    "project_id": self.project_area.pk,
                    "year": 2026,
                    "value": 10,
                    "baseline": 8,
                    "delta": 1.2,
                },
            ],
            funding_opportunity_report_id=self.report.pk,
        )

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, FundingOpportunityReportStatus.SUCCESS)
        results = self.report.results

        # Non-flame metrics keep their existing flat shape, untouched.
        self.assertEqual(
            results["summary"][FundingReportMetric.ABOVEGROUND_TOTAL],
            [{"year": 2026, "value": 10, "baseline": 8, "delta": 25.0}],
        )
        self.assertNotIn(
            "raw_value", results["summary"][FundingReportMetric.ABOVEGROUND_TOTAL][0]
        )

        flame_summary = results["summary"]["TOTAL_FLAME_SEVERITY"]
        flame_projects = results["projects"]["TOTAL_FLAME_SEVERITY"]
        self.assertEqual(set(flame_summary.keys()), {"7_4", "6_4"})
        self.assertEqual(set(flame_projects.keys()), {"7_4", "6_4"})

        seven_four_summary = flame_summary["7_4"][0]
        self.assertEqual(seven_four_summary["value"], 10)
        self.assertEqual(seven_four_summary["baseline"], 40)
        self.assertEqual(seven_four_summary["raw_value"], seven_four_summary["value"])
        self.assertEqual(
            seven_four_summary["total_area"], seven_four_summary["baseline"]
        )

        seven_four_project = flame_projects["7_4"][0]
        self.assertEqual(seven_four_project["project_id"], self.project_area.pk)
        self.assertEqual(seven_four_project["raw_value"], seven_four_project["value"])
        self.assertEqual(
            seven_four_project["total_area"], seven_four_project["baseline"]
        )

        six_four_summary = flame_summary["6_4"][0]
        self.assertEqual(six_four_summary["value"], 5)
        self.assertEqual(six_four_summary["raw_value"], 5)

    def test_finalize_task_sets_failed_status_with_errors(self):
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
        non_flame_metric_count = len(FundingReportMetric) - 1
        self.assertEqual(
            len(tasks),
            1 * non_flame_metric_count * len(FUNDING_REPORT_YEARS)
            + 1 * len(FUNDING_REPORT_YEARS) * len(FLAME_LENGTH_REDUCTION_INTERVALS)
            + 4,
        )

    @mock.patch("funding_report.tasks.chord")
    def test_run_task_dispatches_three_intervals_for_flame_severity(self, chord_mock):
        self.create_all_datalayers()

        run_funding_opportunity_report(self.report.pk)

        tasks = chord_mock.call_args.args[0]
        flame_tasks = [
            task
            for task in tasks
            if task.kwargs.get("metric")
            == FundingReportMetric.TOTAL_FLAME_SEVERITY.value
        ]
        self.assertEqual(
            len(flame_tasks),
            len(FUNDING_REPORT_YEARS) * len(FLAME_LENGTH_REDUCTION_INTERVALS),
        )
        intervals_used = {
            (task.kwargs["from_ft"], task.kwargs["to_ft"]) for task in flame_tasks
        }
        self.assertEqual(intervals_used, set(FLAME_LENGTH_REDUCTION_INTERVALS))

        non_flame_tasks = [
            task
            for task in tasks
            if task.kwargs.get("metric")
            not in (None, FundingReportMetric.TOTAL_FLAME_SEVERITY.value)
        ]
        for task in non_flame_tasks:
            self.assertEqual(
                task.kwargs["from_ft"], FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT
            )
            self.assertEqual(task.kwargs["to_ft"], FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT)

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

    @override_settings(
        WEEKLY_FUNDING_REPORT_USERS_REPORT_EMAIL="signups@planscape.org",
    )
    @mock.patch("funding_report.tasks.send_mail")
    def test_send_weekly_funding_report_users_report(self, send_mail_mock):
        FundingOpportunityReportRun.objects.create(
            report=self.report,
            user=self.user,
            email="planner@example.com",
        )
        FundingOpportunityReportRun.objects.create(
            report=self.report,
            user=self.user,
            email="planner@example.com",
        )
        FundingOpportunityReportRun.objects.create(
            report=self.report,
            user=self.user,
            email="other@example.com",
        )

        send_weekly_funding_report_users_report()

        send_mail_mock.assert_called_once()
        kwargs = send_mail_mock.call_args.kwargs

        self.assertEqual(kwargs["recipient_list"], ["signups@planscape.org"])
        self.assertEqual(kwargs["from_email"], settings.DEFAULT_FROM_EMAIL)
        self.assertIn("Weekly Planscape Funding Report Users", kwargs["subject"])
        self.assertIn("planner@example.com", kwargs["message"])
        self.assertIn("other@example.com", kwargs["message"])
        self.assertIn("(2 reports)", kwargs["message"])
        self.assertIn("planner@example.com", kwargs["html_message"])
        self.assertIn("other@example.com", kwargs["html_message"])

    @override_settings(WEEKLY_FUNDING_REPORT_USERS_REPORT_EMAIL="")
    @mock.patch("funding_report.tasks.send_mail")
    def test_send_weekly_funding_report_users_report_skips_without_recipient(
        self,
        send_mail_mock,
    ):
        FundingOpportunityReportRun.objects.create(
            report=self.report,
            user=self.user,
            email="planner@example.com",
        )

        send_weekly_funding_report_users_report()

        send_mail_mock.assert_not_called()
