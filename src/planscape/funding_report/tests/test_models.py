from django.test import SimpleTestCase

from funding_report.models import (
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
    FundingReportMetric,
    get_funding_report_metadata,
)


class GetFundingReportMetadataTest(SimpleTestCase):
    def test_baseline_metadata(self):
        metadata = get_funding_report_metadata(
            "/tmp/Baseline_2026_aboveground_total_live.tif"
        )

        self.assertEqual(
            metadata,
            {
                "modules": {
                    "funding_report": {
                        "baseline": True,
                        "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
                        "year": 2026,
                    },
                    "map": {
                        "enabled": True,
                    },
                }
            },
        )

    def test_legalmax_metadata(self):
        metadata = get_funding_report_metadata("/tmp/Legalmax_2046_tot_flame_sev.tif")

        self.assertEqual(
            metadata["modules"]["funding_report"],
            {
                "baseline": False,
                "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY,
                "year": 2046,
            },
        )

    def test_unknown_metric_raises(self):
        with self.assertRaises(ValueError):
            get_funding_report_metadata("/tmp/Baseline_2026_tcuft.tif")


class FundingOpportunityReportStatusTest(SimpleTestCase):
    def test_overall_status_success_when_both_succeed(self):
        report = FundingOpportunityReport(
            calculation_status=FundingOpportunityReportStatus.SUCCESS,
            burn_simulation_status=FundingOpportunityReportStatus.SUCCESS,
        )

        self.assertEqual(
            report.get_overall_status(),
            FundingOpportunityReportStatus.SUCCESS,
        )

    def test_overall_status_running_when_burn_simulation_running(self):
        report = FundingOpportunityReport(
            calculation_status=FundingOpportunityReportStatus.SUCCESS,
            burn_simulation_status=FundingOpportunityReportStatus.RUNNING,
        )

        self.assertEqual(
            report.get_overall_status(),
            FundingOpportunityReportStatus.RUNNING,
        )

    def test_overall_status_failed_when_burn_simulation_fails(self):
        report = FundingOpportunityReport(
            calculation_status=FundingOpportunityReportStatus.SUCCESS,
            burn_simulation_status=FundingOpportunityReportStatus.FAILED,
        )

        self.assertEqual(
            report.get_overall_status(),
            FundingOpportunityReportStatus.FAILED,
        )

    def test_overall_status_pending_by_default(self):
        report = FundingOpportunityReport()

        self.assertEqual(
            report.get_overall_status(),
            FundingOpportunityReportStatus.PENDING,
        )

    def test_overall_status_running_when_calculation_running(self):
        report = FundingOpportunityReport(
            calculation_status=FundingOpportunityReportStatus.RUNNING,
            burn_simulation_status=FundingOpportunityReportStatus.SUCCESS,
        )

        self.assertEqual(
            report.get_overall_status(),
            FundingOpportunityReportStatus.RUNNING,
        )

    def test_overall_status_failed_when_calculation_fails(self):
        report = FundingOpportunityReport(
            calculation_status=FundingOpportunityReportStatus.FAILED,
            burn_simulation_status=FundingOpportunityReportStatus.SUCCESS,
        )

        self.assertEqual(
            report.get_overall_status(),
            FundingOpportunityReportStatus.FAILED,
        )
