from rest_framework import serializers

from core.fields import UUIDRelatedField
from metrics.models import Metric
from projects.models import Project
from datasets.serializers import DatasetSerializer


class MetricSerializer(serializers.ModelSerializer):
    organization = serializers.PrimaryKeyRelatedField(
        source="project.organization.id", read_only=True, default=None
    )

    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
    )

    dataset = DatasetSerializer()

    class Meta:
        model = Metric
        fields = (
            "id",
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
