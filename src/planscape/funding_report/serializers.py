from rest_framework import serializers

from funding_report.models import FundingOpportunityReport


class FundingOpportunityReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingOpportunityReport
        fields = ["id", "scenario", "created_by", "created_at", "updated_at", "status"]
        read_only_fields = fields


