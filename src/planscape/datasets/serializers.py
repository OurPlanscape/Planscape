import re
from typing import Any, Collection, Dict, Optional

from core.fields import GeometryTypeField
from core.loaders import get_python_object
from organizations.models import Organization
from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers

from datasets.models import (
    Category,
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    MapServiceChoices,
    StorageTypeChoices,
    Style,
)
from datasets.styles import (
    get_default_raster_style,
    get_default_vector_style,
    get_raster_style,
)
from planning.models import PlanningArea

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
            "selection_type",
            "preferred_display_type",
            "version",
            "modules",
        )


class DataLayerSerializer(serializers.ModelSerializer[DataLayer]):
    category = CategoryEmbbedSerializer()
    public_url = serializers.CharField(
        source="get_public_url",
        read_only=True,
    )
    map_url = serializers.CharField(
        source="get_map_url",
        read_only=True,
    )
    styles = serializers.SerializerMethodField()
    original_name = serializers.CharField(read_only=True)

    def _default_raster_style(self, instance):
        stats = instance.info.get("stats")[0]
        return get_default_raster_style(**stats)

    def get_styles(self, instance):
        if instance.styles.all().exists():
            style = instance.styles.all().first()
            return [get_raster_style(datalayer=instance, style=style)]
        match instance.type:
            case DataLayerType.RASTER:
                stats = (
                    instance.info.get("stats", [])[0]
                    if instance.info
                    else {"min": 0, "max": 1}
                )
                nodata = instance.info.get("nodata") if instance.info else None
                if nodata:
                    stats["nodata"] = nodata
                return get_default_raster_style(**stats)
            case _:
                return get_default_vector_style()

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
            "styles",
            "url",
            "storage_type",
            "public_url",
            "map_url",
            "info",
            "metadata",
            "map_service_type",
            "original_name",
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
            "modules",
        )


class CreateDataLayerSerializer(serializers.ModelSerializer[DataLayer]):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    original_name = serializers.CharField(
        required=False,
        allow_null=True,
    )
    url = serializers.URLField(required=False, allow_null=True)
    storage_type = serializers.ChoiceField(
        choices=StorageTypeChoices.choices,
        required=False,
        allow_null=True,
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

    map_service_type = serializers.ChoiceField(
        choices=MapServiceChoices.choices,
        required=False,
        allow_null=True,
    )
    outline = gis_serializers.GeometryField(
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
            "url",
            "mimetype",
            "outline",
            "geometry_type",
            "style",
            "map_service_type",
            "storage_type",
        )

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        url = attrs.get("url")
        original_name = attrs.get("original_name")

        if bool(url) == bool(original_name):
            raise serializers.ValidationError(
                "Provide either 'url' or 'original_name' (uploaded file), but not both."
            )

        return attrs


class ChangeDataLayerStatusSerializer(serializers.Serializer):
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
    )
    status = serializers.ChoiceField(choices=DataLayerStatus.choices)

    def validate(self, attrs):
        """Enforce the finite-state-machine logic."""
        desired_status = attrs["status"]
        current_status = self.context["current_status"]

        if current_status == DataLayerStatus.PENDING:
            if desired_status not in [DataLayerStatus.READY, DataLayerStatus.FAILED]:
                raise serializers.ValidationError(
                    f"Cannot transition from PENDING to {desired_status}"
                )

        elif current_status == DataLayerStatus.READY:
            if desired_status not in [DataLayerStatus.READY, DataLayerStatus.FAILED]:
                raise serializers.ValidationError(
                    f"Cannot transition from READY to {desired_status}"
                )

        return attrs


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
    datalayers = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=DataLayer.objects.all()),
        required=False,
        help_text="Optional list of datalayer IDs to associate with this style upon creation.",
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
            "datalayers",
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
        allow_null=True,
    )  # type: ignore


class NoDataSerializer(serializers.Serializer):
    values = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        allow_null=True,
        default=list,
    )
    color = serializers.RegexField(
        regex=COLOR_REGEX,
        required=False,
        allow_null=True,
    )
    opacity = serializers.FloatField(
        min_value=0,
        max_value=1,
        default=0,
        allow_null=True,
    )
    label = serializers.CharField(
        required=False,
        allow_null=True,
    )  # type: ignore


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
            "modules",
        )


class BrowseDataLayerSerializer(serializers.ModelSerializer["DataLayer"]):
    organization = OrganizationSimpleSerializer()
    dataset = DatasetSimpleSerializer()
    path = serializers.SerializerMethodField()
    map_url = serializers.SerializerMethodField()
    styles = serializers.SerializerMethodField()

    def _default_raster_style(self, instance):
        stats = instance.info.get("stats")[0]
        return get_default_raster_style(**stats)

    def get_styles(self, instance) -> Collection[Dict[str, Any]]:
        if instance.styles.all().exists():
            style = instance.styles.all().first()
            return [get_raster_style(datalayer=instance, style=style)]

        match instance.type:
            case DataLayerType.RASTER:
                stats = (
                    instance.info.get("stats", [])[0]
                    if instance.info
                    else {"min": 0, "max": 1}
                )
                nodata = instance.info.get("nodata") if instance.info else None
                if nodata:
                    stats["nodata"] = nodata
                return [get_default_raster_style(**stats)]
            case _:
                return [get_default_vector_style()]

    def get_path(self, instance) -> Collection[str]:
        if instance.category:
            return instance.category._get_full_path(instance.category.pk)

        return []

    def get_map_url(self, instance) -> Optional[str]:
        if instance.type == DataLayerType.RASTER:
            return None
        return instance.get_map_url()

    class Meta:
        model = DataLayer
        fields = (
            "id",
            "organization",
            "dataset",
            "path",
            "map_url",
            "name",
            "type",
            "geometry_type",
            "status",
            "storage_type",
            "info",
            "metadata",
            "map_service_type",
            "styles",
        )


class BrowseDataLayerFilterSerializer(serializers.Serializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    name = serializers.CharField(
        required=False,
    )
    type = serializers.ChoiceField(
        choices=DataLayerType.choices,
        required=False,
        allow_null=True,
    )


class BrowseDataSetSerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        from modules.base import MODULE_HANDLERS

        super().__init__(*args, **kwargs)
        choices = list(MODULE_HANDLERS.keys())
        self.fields["module"] = serializers.ChoiceField(
            choices=choices,
            required=False,
        )

    type = serializers.ChoiceField(choices=DataLayerType.choices, required=False)

    geometry = GeometryTypeField(
        geometry_type="MultiPolygon",
        destination_srid=4269,
        coerce_multi=True,
        required=False,
    )

    planning_area_id = serializers.PrimaryKeyRelatedField(
        queryset=PlanningArea.objects.all(),
        required=False,
        help_text="Planning Area primary key (ID) that geometry will be used.",
    )

    def validate(self, attrs):
        geometry = attrs.get("geometry")
        planning_area_id = attrs.get("planning_area_id")

        if all((geometry, planning_area_id)):
            raise serializers.ValidationError(
                "It is necessary to set `geometry` OR `planning_area_id`."
            )
        
        if planning_area_id and not geometry:
            attrs["geometry"] = planning_area_id.geometry

        return super().validate(attrs)


class FindAnythingSerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        from modules.base import MODULE_HANDLERS

        super().__init__(*args, **kwargs)
        choices = list(MODULE_HANDLERS.keys())
        self.fields["module"] = serializers.ChoiceField(
            choices=choices,
            required=False,
        )

    term = serializers.CharField(required=True)

    type = serializers.ChoiceField(
        choices=DataLayerType.choices,
    )

    geometry = GeometryTypeField(
        geometry_type="MultiPolygon",
        destination_srid=4269,
        coerce_multi=True,
        required=False,
    )


class SearchResultsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.CharField()
    data = serializers.JSONField()  # type: ignore
