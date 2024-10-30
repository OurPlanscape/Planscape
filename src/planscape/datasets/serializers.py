from pathlib import Path
from typing import Any, Dict, Optional
from rest_framework import serializers
from core.loaders import get_python_object
from core.s3 import create_download_url
from datasets.models import Category, Dataset, DataLayer
from impacts.models import ImpactVariable


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
    public_url = serializers.CharField(
        source="get_public_url",
        read_only=True,
    )

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
            "public_url",
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
    metadata = serializers.JSONField(
        required=False,
        allow_null=True,
    )
    info = serializers.JSONField(
        required=False,
        allow_null=True,
    )

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
            "info",
            "metadata",
            "original_name",
            "mimetype",
            "geometry",
            "geometry_type",
        )


class DataLayerCreatedSerializer(serializers.Serializer):
    datalayer = DataLayerSerializer()
    upload_to = serializers.JSONField()


class ProviderMetadataSerializer(serializers.Serializer):
    """This serializers tries to bridge the gap between
    what we had in original planscape and the new things
    we want to build.

    Planscape originally only used information from the RRKs and,
    these datasets have a specific provider metadata shape. They
    are bundled inside the RRK, but are produced by someone else.

    Most likely this structure will not capture all the needs
    of future metadata storage and we should use a _real_ metadata
    standard, such as OGC CSW.
    """

    # example: CECS
    name = serializers.CharField(
        required=False,
        help_text="Name of the original provider.",
    )
    dataset = serializers.CharField(
        required=False,
        help_text="Dataset that the datalayer belongs to, for the original provider.",
    )
    reference = serializers.URLField(
        required=False,
        help_text="URL where the user can discover more about the data, from the provider.",
    )
    original_url = serializers.URLField(
        required=False,
        help_text="URL where the original data is located.",
    )


class SourceMetadataSerializer(serializers.Serializer):
    provider = ProviderMetadataSerializer(
        required=False,
    )

    units = serializers.CharField(
        required=False,
    )


class DataLayerMetadataSerializer(serializers.Serializer):
    module_validators: Dict[str, str] = {
        "impacts": "impacts.serializers.DataLayerImpactsModuleSerializer",
    }
    modules = serializers.DictField(
        required=False,
    )
    source = SourceMetadataSerializer(
        required=False,
    )

    def __init__(self, *args, **kwargs):
        module_validators = kwargs.get("module_validators", {}) or {}
        if module_validators:
            self.module_validators = module_validators
        super().__init__(*args, **kwargs)

    def validate_module(self, name, values):
        try:
            module = self.module_validators[name]
            ModuleSerializerClass = get_python_object(module)
        except Exception:
            raise serializers.ValidationError(
                f"Invalid module specification. {name} is not supported."
            )

        serializer: serializers.Serializer = ModuleSerializerClass(data=values)
        serializer.is_valid(raise_exception=True)
        return values

    def validate(self, attrs):
        modules = attrs.get("modules", {}) or {}
        for name, values in modules.items():
            self.validate_module(name, values)
        return super().validate(attrs)
