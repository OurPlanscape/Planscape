from rest_framework import serializers

from datasets.models import Dataset
from goals.models import MetricUsage, TreatmentGoal
from metrics.models import Metric


class MetricGoalSerializer(serializers.ModelSerializer):

    """Specific serializer to be used within goals.
    READ ONLY.
    """

    class Meta:
        model = Metric
        fields = (
            "uuid",
            "category",
            "name",
            "display_name",
        )


class DatasetGoalSerializer(serializers.ModelSerializer):
    """Specific serializer to be used within goals.
    READ ONLY
    """

    class Meta:
        model = Dataset
        fields = (
            "uuid",
            "name",
            "type",
            "url",
            "data_units",
            "provider",
            "source",
            "source_url",
            "reference_url",
        )


class MetricUsageSerializer(serializers.ModelSerializer):
    metric = MetricGoalSerializer()
    dataset = DatasetGoalSerializer(source="metric.dataset")

    class Meta:
        model = MetricUsage
        fields = (
            "metric",
            "dataset",
            "type",
            "attribute",
            "pre_processing",
            "post_processing",
            "output_units",
        )


class TreatmentGoalSerializer(serializers.ModelSerializer):
    organization = serializers.UUIDField(
        source="project.organization.uuid", read_only=True
    )

    metric_usages = MetricUsageSerializer(
        many=True,
        read_only=True,
    )

    project = serializers.UUIDField(source="project.uuid", read_only=True)

    class Meta:
        model = TreatmentGoal
        fields = (
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "deleted_at",
            "organization",
            "project",
            "name",
            "summary",
            "description",
            "metric_usages",
            "executor",
            "execution_options",
        )
