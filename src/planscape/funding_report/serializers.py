from rest_framework import serializers

from funding_report.models import FundingOpportunityReport


class FundingOpportunityReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingOpportunityReport
        fields = [
            "id",
            "scenario",
            "created_by",
            "created_at",
            "updated_at",
            "status",
            "results",
        ]
        read_only_fields = fields


class FundingReportAETImprovementRequestSerializer(serializers.Serializer):
    percentage = serializers.FloatField(min_value=0)
