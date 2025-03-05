import re
from typing import Any, Collection, Dict

from core.loaders import get_python_object
from organizations.models import Organization
from rest_framework import serializers

from datasets.models import Category, DataLayer, DataLayerType, Dataset, Style
from datasets.services import get_assigned_style


class OrganizationSimpleSerializer(serializers.ModelSerializer["Organization"]):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
        )


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
    organization = OrganizationSimpleSerializer()

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


class SimplifiedStyleSerializer(serializers.ModelSerializer[Style]):
    class Meta:
        model = Style
        fields = (
            "id",
            "data"
        )

class DataLayerSerializer(serializers.ModelSerializer[DataLayer]):
    category = CategoryEmbbedSerializer()
    public_url = serializers.CharField(
        source="get_public_url",
        read_only=True,
    )
    style = SimplifiedStyleSerializer(
        source="get_style",
        read_only=True,
    ) # type: ignore

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
            "style",
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
    original_name = serializers.CharField(
        required=True,
    )
    metadata = serializers.JSONField(
        required=False,
        allow_null=True,
    )
    info = serializers.JSONField(
        required=False,
        allow_null=True,
    )
    style = serializers.PrimaryKeyRelatedField(
        queryset=Style.objects.all(),
        required=False,
        allow_null=True,
    )  # type: ignore

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
            "style",
        )


class StyleSerializer(serializers.ModelSerializer[Style]):
    class Meta:
        model = Style
        fields = (
            "id",
            "created_by",
            "organization",
            "name",
            "type",
            "data",
            "data_hash",
        )


class CreateStyleSerializer(serializers.ModelSerializer[Style]):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )
    type = serializers.ChoiceField(
        choices=DataLayerType.choices,
        required=True,
        allow_null=False,
    )

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        type = attrs.get("type") or None
        if not type:
            raise serializers.ValidationError("type field cannot be null")
        style_data = attrs.get("data", {}) or {}
        match type:
            case DataLayerType.RASTER:
                data_serializer = RasterStyleSerializer(data=style_data)
            case _:
                raise serializers.ValidationError("vector styles not implemented yet.")
        data_serializer.is_valid(raise_exception=True)
        return attrs

    class Meta:
        model = Style
        fields = (
            "id",
            "created_by",
            "organization",
            "name",
            "type",
            "data",
        )


COLOR_REGEX = re.compile(r"^#(?:[0-9a-fA-F]{1,2}){3}$")


class EntrySerializer(serializers.Serializer):
    value = serializers.FloatField()
    color = serializers.RegexField(regex=COLOR_REGEX)
    opacity = serializers.FloatField(
        min_value=0,
        max_value=1,
        default=1,
    )
    label = serializers.CharField(
        required=False,
        default="",
    )  # type: ignore


class NoDataSerializer(serializers.Serializer):
    values = serializers.ListField(child=serializers.FloatField())
    color = serializers.RegexField(regex=COLOR_REGEX)
    opacity = serializers.FloatField(
        min_value=0,
        max_value=1,
        default=1,
    )
    label = serializers.CharField(
        required=False,
        default="",
    )


class RasterStyleSerializer(serializers.Serializer):
    no_data = NoDataSerializer(
        required=False,
        default=dict,
    )
    type = serializers.ChoiceField(
        choices=["RAMP", "INTERVALS", "VALUES"],
        default="RAMP",
    )
    entries = serializers.ListField(
        child=EntrySerializer(),
        min_length=1,
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
    )  # type: ignore

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


class StyleCreatedSerializer(serializers.Serializer):
    style = StyleSerializer()  # type: ignore
    possibly_exists = serializers.BooleanField()


class AssociateStyleSerializer(serializers.Serializer):
    # TODO: move queryset to be a callable and filter permissions
    record = serializers.PrimaryKeyRelatedField(queryset=DataLayer.objects.all())


class AssociateDataLayerSerializer(serializers.Serializer):
    # TODO: move queryset to be a callable and filter permissions
    record = serializers.PrimaryKeyRelatedField(queryset=Style.objects.all())


class DataLayerHasStyleSerializer(serializers.Serializer):
    datalayer = DataLayerSerializer()
    style = StyleSerializer()  # type: ignore


class DatasetSimpleSerializer(serializers.ModelSerializer["Dataset"]):
    class Meta:
        model = Dataset
        fields = (
            "id",
            "name",
        )


class StyleSimpleSerializer(serializers.ModelSerializer["Style"]):
    class Meta:
        model = Style
        fields = (
            "id",
            "data",
        )


class BrowseDataLayerSerializer(serializers.ModelSerializer["DataLayer"]):
    organization = OrganizationSimpleSerializer()
    dataset = DatasetSimpleSerializer()
    path = serializers.SerializerMethodField()
    public_url = serializers.CharField(
        source="get_public_url",
        read_only=True,
    )
    styles = StyleSimpleSerializer(many=True)

    def get_path(self, instance) -> Collection[str]:
        if instance.category:
            ancestors_names = list([c.name for c in instance.category.get_ancestors()])
            ancestors_names = [*ancestors_names, instance.category.name]
        else:
            ancestors_names = []

        return ancestors_names

    class Meta:
        model = DataLayer
        fields = (
            "id",
            "organization",
            "dataset",
            "path",
            "public_url",
            "name",
            "type",
            "geometry_type",
            "status",
            "info",
            "metadata",
            "styles",
            "geometry",
        )


class FindAnythingSerializer(serializers.Serializer):
    term = serializers.CharField(required=True)

    limit = serializers.IntegerField(required=False, min_value=1)

    offset = serializers.IntegerField(required=False, min_value=1)


class SearchResultSerialzier(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.CharField()
    url = serializers.URLField()
    data = serializers.JSONField()  # type: ignore
