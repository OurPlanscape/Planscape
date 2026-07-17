import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import uuid

from core.gcs import create_download_url as create_gcs_download_url
from core.gcs import get_bucket_and_key as get_gcs_bucket_and_key
from core.gcs import is_gcs_file
from core.models import CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin
from core.s3 import create_download_url as create_s3_download_url
from core.s3 import get_bucket_and_key as get_s3_bucket_and_key
from core.s3 import is_s3_file
from django.contrib.auth.models import User
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta
from planning.models import GeoPackageStatus, Scenario
from utils.frontend import get_base_url
from django.conf import settings


class FundingOpportunityReportStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Success"
    FAILED = "FAILED", "Failed"
    EMPTY = "EMPTY", "Empty"


FUNDING_REPORT_YEARS = (2026, 2031, 2036, 2041, 2046)

FLAME_LENGTH_REDUCTION_DEFAULT_FROM_FT = 7.0
FLAME_LENGTH_REDUCTION_DEFAULT_TO_FT = 4.0

# (from_ft, to_ft) intervals calculated and stored for every funding report run.
FLAME_LENGTH_REDUCTION_INTERVALS: Tuple[Tuple[float, float], ...] = (
    (7.0, 4.0),
    (6.0, 4.0),
    (4.0, 2.0),
)

AET_IMPROVEMENT_DEFAULT_PERCENTAGE = 25.0


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

TREATMENT_VARIABLE = "TREATMENT"
TREATMENT_ROLE = "treatment"
TREATMENT_CLIP_ROLE = "treatment_clip"

BIOMASS_VARIABLE = "BIOMASS"

WOOD_TYPE_SOFTWOOD = 1
WOOD_TYPE_HARDWOOD = 2
WOOD_TYPE_MIXED = 3


class BiomassRole(models.TextChoices):
    MERCHANTABLE = "merchantable", "Merchantable"
    NON_MERCHANTABLE = "non_merchantable", "Non-Merchantable"
    WOOD_TYPE = "wood_type", "Wood Type"


class FundingReportLayerKey(models.TextChoices):
    BASELINE_ABOVEGROUND_CARBON_2026 = (
        "baseline_aboveground_carbon_2026",
        "Baseline Aboveground Carbon 2026",
    )
    BASELINE_SMOKE_PRODUCTION_2026 = (
        "baseline_smoke_production_2026",
        "Baseline Smoke Production 2026",
    )
    BASELINE_FLAME_LENGTH_2026 = (
        "baseline_flame_length_2026",
        "Baseline Flame Length 2026",
    )
    AET_BASELINE = "aet_baseline", "AET Baseline"
    AET_TARGET = "aet_target", "AET Target"
    AET_PERCENTUAL_CHANGE = "aet_percentual_change", "AET Percentual Change"
    MILLS_AND_OTHER_BIOMASS_FACILITIES = (
        "mills_and_other_biomass_facilities",
        "Mills & Other Biomass Facilities",
    )


class FundingReportLayerCategory(models.TextChoices):
    CARBON = "carbon", "Carbon"
    WATER = "water", "Water"
    BIOMASS = "biomass", "Biomass"
    WILDFIRE_RISK_REDUCTION = "wildfire_risk_reduction", "Wildfire Risk Reduction"


FUNDING_REPORT_LAYER_CATEGORIES: Dict[
    FundingReportLayerKey, FundingReportLayerCategory
] = {
    FundingReportLayerKey.BASELINE_ABOVEGROUND_CARBON_2026: FundingReportLayerCategory.CARBON,
    FundingReportLayerKey.BASELINE_SMOKE_PRODUCTION_2026: FundingReportLayerCategory.CARBON,
    FundingReportLayerKey.BASELINE_FLAME_LENGTH_2026: FundingReportLayerCategory.WILDFIRE_RISK_REDUCTION,
    FundingReportLayerKey.AET_BASELINE: FundingReportLayerCategory.WATER,
    FundingReportLayerKey.AET_TARGET: FundingReportLayerCategory.WATER,
    FundingReportLayerKey.AET_PERCENTUAL_CHANGE: FundingReportLayerCategory.WATER,
    FundingReportLayerKey.MILLS_AND_OTHER_BIOMASS_FACILITIES: FundingReportLayerCategory.BIOMASS,
}

# Label for pixels that are nodata in the treatments raster.
TREATMENT_NO_TREATMENT_LABEL = "No Treatment"

# Maps raster pixel values from the treatments layer to treatment-type labels.
TREATMENT_PIXEL_VALUE_LABELS: Dict[int, str] = {
    1: "Rx Burn",
    2: "Thin and Rx Burn",
}


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
            },
            "map": {
                "enabled": True,
            },
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

    treatment_datalayer_id: Optional[int]
    treatment_datalayer = models.ForeignKey(
        "datasets.DataLayer",
        related_name="funding_opportunity_reports",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="DataLayer generated by clipping the treatments raster to this scenario's project areas.",
    )

    aet_datalayer_id: Optional[int]
    aet_datalayer = models.ForeignKey(
        "datasets.DataLayer",
        related_name="funding_opportunity_reports_aet",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="DataLayer generated by clipping the AET percentual raster to this scenario's project areas.",
    )

    geopackage_status = models.CharField(
        max_length=32,
        choices=GeoPackageStatus.choices,
        null=True,
        help_text="Status of the geopackage generation.",
    )

    geopackage_url = models.URLField(
        null=True,
        help_text="Cloud storage URL of the generated geopackage.",
    )

    class Meta(TypedModelMeta):
        ordering = ["scenario", "-created_at"]

    def get_geopackage_url(self) -> Optional[str]:
        if not self.geopackage_url:
            return None

        if is_s3_file(self.geopackage_url):
            bucket, key = get_s3_bucket_and_key(self.geopackage_url)
            return create_s3_download_url(bucket, key)
        elif is_gcs_file(self.geopackage_url):
            bucket, key = get_gcs_bucket_and_key(self.geopackage_url)
            return create_gcs_download_url(self.geopackage_url, bucket_name=bucket)
        return None


class FundingOpportunityReportRun(CreatedAtMixin, models.Model):
    id: int

    report_id: int
    report = models.ForeignKey(
        FundingOpportunityReport,
        related_name="runs",
        on_delete=models.CASCADE,
    )

    user_id: Optional[int]
    user = models.ForeignKey(
        User,
        related_name="funding_opportunity_report_runs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    email = models.EmailField(blank=True)

    class Meta(TypedModelMeta):
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]


class FundingOpportunityReportInvite(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin):
    id: int

    report_id: int
    report = models.ForeignKey(
        FundingOpportunityReport,
        related_name="funding_opportunity_report_invites",
        on_delete=models.CASCADE,
    )

    inviter_id: int
    inviter = models.ForeignKey(
        User,
        related_name="funding_opportunity_report_inviters",
        on_delete=models.CASCADE,
    )

    invitee_email = models.EmailField()
    invitee = models.ForeignKey(
        User,
        related_name="funding_opportunity_report_invitees",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )


class FundingOpportunityReportSharedLink(CreatedAtMixin, DeletedAtMixin):
    id: int
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    report_id: int
    report = models.ForeignKey(
        FundingOpportunityReport,
        related_name="funding_opportunity_report_shared_links",
        on_delete=models.CASCADE,
    )

    # set of selected key/values to be shared (e.g. AET, TOTAL_FLAME_SEVERITY)
    configuration = models.JSONField()
    
    def get_public_url(self):
        #TODO: Update the public URL once the path is defined
        base_url = get_base_url(settings.ENV)
        return f"{base_url}/for/{self.uuid}"

