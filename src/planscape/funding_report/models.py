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

    class Meta(TypedModelMeta):
        ordering = ["scenario", "-created_at"]
