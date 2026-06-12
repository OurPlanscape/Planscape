import re
from pathlib import Path
from typing import Any, Dict

from core.models import CreatedAtMixin, UpdatedAtMixin
from django.contrib.auth.models import User
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta
from planning.models import Scenario


class FundingOpportunityReportStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Success"
    FAILED = "FAILED", "Failed"


FUNDING_REPORT_YEARS = (2026, 2031, 2036, 2041, 2046)

FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT = 7.0
FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT = 4.0


class FundingReportMetric(models.TextChoices):
    ABOVEGROUND_TOTAL = "ABOVEGROUND_TOTAL", "Aboveground Total"
    POTENTIAL_SMOKE = "POTENTIAL_SMOKE", "Potential Smoke"
    TOTAL_FLAME_SEVERITY = "TOTAL_FLAME_SEVERITY", "Total Flame Severity"


FUNDING_REPORT_FILENAME_METRICS = {
    "aboveground_total_live": FundingReportMetric.ABOVEGROUND_TOTAL,
    "pot_smoke_sev": FundingReportMetric.POTENTIAL_SMOKE,
    "tot_flame_sev": FundingReportMetric.TOTAL_FLAME_SEVERITY,
}

FUNDING_REPORT_DATALAYER_NAME_REGEX = re.compile(
    r"^(?P<kind>Baseline|Legalmax)_(?P<year>\d{4})_(?P<metric>.+?)(?:_3857_COG)?\.tif$",
    re.IGNORECASE,
)


def get_funding_report_metadata(input_file: str) -> Dict[str, Any]:
    name = Path(input_file).name
    match = FUNDING_REPORT_DATALAYER_NAME_REGEX.match(name)
    if not match:
        raise ValueError(
            "Funding report datalayer names must match "
            "Baseline_<year>_<metric>.tif or Legalmax_<year>_<metric>.tif."
        )

    year = int(match.group("year"))
    if year not in FUNDING_REPORT_YEARS:
        raise ValueError(f"Funding report year {year} is not supported.")

    metric_name = match.group("metric").lower()
    metric = FUNDING_REPORT_FILENAME_METRICS.get(metric_name)
    if metric is None:
        raise ValueError(f"Funding report metric {metric_name} is not supported.")

    return {
        "modules": {
            "funding_report": {
                "baseline": match.group("kind").lower() == "baseline",
                "variable": metric.value,
                "year": year,
            }
        }
    }


class FundingOpportunityReport(CreatedAtMixin, UpdatedAtMixin, models.Model):
    id: int
    scenario_id: int
    scenario = models.OneToOneField(
        Scenario,
        related_name="funding_opportunity_report",
        on_delete=models.CASCADE,
    )

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="funding_opportunity_reports",
        on_delete=models.RESTRICT,
        null=True,
    )

    status = models.CharField(
        max_length=16,
        choices=FundingOpportunityReportStatus.choices,
        default=FundingOpportunityReportStatus.PENDING,
        help_text="Status of the Funding Opportunity Report.",
    )

    results = models.JSONField(
        null=True,
        help_text="Funding opportunity report calculation results.",
    )

    class Meta(TypedModelMeta):
        ordering = ["scenario", "-created_at"]
