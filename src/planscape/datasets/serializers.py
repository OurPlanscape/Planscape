from rest_framework import serializers

from core.fields import UUIDRelatedField
from datasets.models import Dataset
from organizations.models import Organization


class DatasetSerializer(serializers.ModelSerializer):
    organization = UUIDRelatedField(
        uuid_field="uuid",
        queryset=Organization.objects.all(),
    )

    class Meta:
        model = Dataset
        fields = (
            "uuid",
            "organization",
            "name",
            "type",
            "blob_status",
            "url",
        )


class DatasetDetailSerializer(DatasetSerializer):
    class Meta:
        model = Dataset
        fields = (
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "deleted_at",
            "organization",
            "name",
            "type",
            "blob_status",
            "info",
            "url",
            "geometry",
            "operations",
            "data_units",
            "provider",
            "source",
            "source_url",
            "reference_url",
        )