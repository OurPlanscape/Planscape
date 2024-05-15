from rest_framework import serializers

from core.fields import UUIDRelatedField
from metrics.models import Metric
from projects.models import Project
from datasets.serializers import DatasetSerializer


class MetricSerializer(serializers.ModelSerializer):
    organization = serializers.UUIDField(
        source="project.organization.uuid", read_only=True, default=None
    )

    project = UUIDRelatedField(
        uuid_field="uuid",
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
