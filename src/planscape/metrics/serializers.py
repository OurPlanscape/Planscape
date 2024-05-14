from rest_framework import serializers

from base.condition_types import Metric
from datasets.serializers import DatasetSerializer
from projects.models import Project


class MetricSerializer(serializers.ModelSerializer):
    organization = serializers.CharField(
        source="project.organization.uuid", read_only=True
    )

    project = serializers.PrimaryKeyRelatedField(
        pk_field="uuid",
        queryset=Project.objects.all(),
    )

    dataset = DatasetSerializer()

    class Meta:
        model = Metric
        fields = (
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "deleted_at",
            "organization",
            "project",
            "dataset",
            "category",
            "name",
            "display_name",
            "capabilities",
        )
