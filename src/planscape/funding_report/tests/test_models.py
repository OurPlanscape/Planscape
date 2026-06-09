from django.test import SimpleTestCase

from funding_report.models import (
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
                    }
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
