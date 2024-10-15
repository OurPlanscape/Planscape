from typing import Optional
from rest_framework import serializers
from datasets.models import Category, Dataset, DataLayer


class CategorySerializer(serializers.ModelSerializer[Category]):
    class Meta:
        model = Category
        fields = (
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
            "created_by",
            "organization",
            "dataset",
            "order",
            "name",
        )


class CategoryEmbbedSerializer(serializers.ModelSerializer):
    parent = serializers.SerializerMethodField()  # type: ignore
    depth = serializers.IntegerField(
        source="get_depth",
        read_only=True,
    )

    def get_parent(self, instance):
        parent = instance.get_parent()
        if parent is not None:
            return self.to_representation(parent)
        return None

    class Meta:
        model = Category
        fields = (
            "id",
            "order",
            "name",
            "parent",
            "depth",
        )


class DatasetSerializer(serializers.ModelSerializer[Dataset]):
    class Meta:
        model = Dataset
        fields = (
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
            "created_by",
            "organization",
            "name",
            "description",
            "visibility",
            "version",
        )


class DataLayerSerializer(serializers.ModelSerializer[DataLayer]):
    category = CategoryEmbbedSerializer()

    class Meta:
        model = DataLayer
        fields = (
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
            "created_by",
            "organization",
            "dataset",
            "category",
            "name",
            "type",
            "geometry_type",
            "status",
            "url",
            "info",
            "metadata",
        )


class CreateDatasetSerializer(serializers.ModelSerializer[DataLayer]):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Dataset
        fields = (
            "id",
            "created_by",
            "organization",
            "name",
            "visibility",
            "version",
        )


class CreateDataLayerSerializer(serializers.ModelSerializer[DataLayer]):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = DataLayer
        fields = (
            "id",
            "created_by",
            "organization",
            "dataset",
            "category",
            "name",
            "type",
            "geometry_type",
            "info",
            "geometry",
        )


class DataLayerCreatedSerializer(serializers.Serializer):
    datalayer = DataLayerSerializer()
    upload_to = serializers.JSONField()
