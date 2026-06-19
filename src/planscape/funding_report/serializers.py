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
            "treatment_datalayer",
        ]
        read_only_fields = fields


class FundingReportAETImprovementRequestSerializer(serializers.Serializer):
    percentage = serializers.FloatField(min_value=0)


class FundingReportFlameLengthReductionRequestSerializer(serializers.Serializer):
    from_ft = serializers.FloatField(min_value=0)
    to_ft = serializers.FloatField(min_value=0)

    def validate(self, attrs):
        if attrs.get("from_ft") is not None and attrs.get("to_ft") is not None:
            if attrs["from_ft"] <= attrs["to_ft"]:
                raise serializers.ValidationError(
                    "from_ft must be greater than to_ft (e.g. from_ft=7, to_ft=4)."
                )
        return attrs


class FundingReportAETImprovementProjectAreaSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    improved_acres = serializers.FloatField()
    total_acres = serializers.FloatField()
    improved_area_percent = serializers.FloatField()


class FundingReportAETImprovementResponseSerializer(serializers.Serializer):
    percentage = serializers.FloatField()
    improved_acres = serializers.FloatField()
    total_project_area_acres = serializers.FloatField()
    improved_area_percent = serializers.FloatField()
    project_areas = FundingReportAETImprovementProjectAreaSerializer(many=True)


class FundingReportFlameLengthReductionSummarySerializer(serializers.Serializer):
    year = serializers.IntegerField()
    value = serializers.FloatField(allow_null=True)
    baseline = serializers.FloatField(allow_null=True)
    delta = serializers.FloatField(allow_null=True)


class FundingReportFlameLengthReductionProjectSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    proj_id = serializers.CharField(allow_null=True, required=False)
    year = serializers.IntegerField()
    value = serializers.FloatField(allow_null=True)
    baseline = serializers.FloatField(allow_null=True)
    delta = serializers.FloatField(allow_null=True)


class FundingReportFlameLengthReductionResponseSerializer(serializers.Serializer):
    interval = serializers.DictField(
        child=serializers.FloatField(),
        help_text="Flame length interval in feet, e.g. {'from': 7.0, 'to': 4.0}.",
    )
    summary = FundingReportFlameLengthReductionSummarySerializer(many=True)
    projects = FundingReportFlameLengthReductionProjectSerializer(many=True)
