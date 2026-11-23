import math
import re
from typing import Any, Collection, Dict, Optional

from core.fields import GeometryTypeField
from core.loaders import get_python_object
from datasets.models import (
    Category,
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    MapServiceChoices,
    SearchGroupBy,
    SearchTab,
    SimpleCategory,
    StorageTypeChoices,
    Style,
    VisibilityOptions,
    WorkspaceFavoriteDataLayer,
)
from datasets.upload_metadata import read_upload_metadata
from datasets.styles import (
    get_default_raster_style,
    get_default_raster_style_for,
    get_default_vector_style,
    get_raster_style,
)
from django.conf import settings
from django.core.validators import URLValidator
from organizations.models import Organization
from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers
from workspaces.models import Workspace


def get_available_workspaces_for_request(request: Any):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return Workspace.objects.none()

    return Workspace.objects.filter(user_access__user=user).distinct()


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


class SimpleCategorySerializer(serializers.ModelSerializer[SimpleCategory]):
    class Meta:
        model = SimpleCategory
        fields = (
            "id",
            "name",
            "icon",
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
    path = serializers.SerializerMethodField()
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
                if nodata is not None:
                    stats["nodata"] = nodata
                return [get_default_raster_style(**stats)]
            case _:
                return [get_default_vector_style()]

    def get_path(self, instance) -> Collection[str]:
        if instance.category:
            return instance.category._get_full_path()
        return []

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
            "path",
            "url",
            "storage_type",
            "public_url",
            "map_url",
            "info",
            "metadata",
            "map_service_type",
            "original_name",
        )


class CreateDatasetSerializer(serializers.ModelSerializer[Dataset]):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    workspace_id = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.none(),
        source="workspace",
        write_only=True,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["workspace_id"].queryset = get_available_workspaces_for_request(
            self.context.get("request"),
        )

    class Meta:
        model = Dataset
        fields = (
            "id",
            "created_by",
            "organization",
            "workspace_id",
            "name",
            "visibility",
            "version",
            "modules",
            "selection_type",
            "preferred_display_type",
        )


class UpdateDatasetSerializer(serializers.ModelSerializer[Dataset]):
    name = serializers.CharField(required=False)
    visibility = serializers.ChoiceField(
        choices=VisibilityOptions.choices,
        required=False,
    )

    class Meta:
        model = Dataset
        fields = (
            "id",
            "organization",
            "workspace_id",
            "name",
            "visibility",
            "version",
            "modules",
            "selection_type",
            "preferred_display_type",
        )
        read_only_fields = ("id",)


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


class NoDataValueField(serializers.Field):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.lower() == "nan":
            return "nan"
        return serializers.FloatField().to_internal_value(data)

    def to_representation(self, value):
        if isinstance(value, str) and value.lower() == "nan":
            return "nan"
        return serializers.FloatField().to_representation(value)


class NoDataSerializer(serializers.Serializer):
    values = serializers.ListField(
        child=NoDataValueField(),
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
    simple_categories = SimpleCategorySerializer(many=True, read_only=True)
    path = serializers.SerializerMethodField()
    map_url = serializers.SerializerMethodField()
    styles = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField(
        help_text="Whether the DataLayer is a favorite of the requested workspace. "
        "Null when no workspace was supplied.",
    )

    def get_is_favorite(self, instance) -> Optional[bool]:
        favorite_ids = self.context.get("favorite_datalayer_ids")
        if favorite_ids is None:
            return None
        return instance.pk in favorite_ids

    def _default_raster_style(self, instance):
        stats = instance.info.get("stats")[0]
        return get_default_raster_style(**stats)

    def get_styles(self, instance) -> Collection[Dict[str, Any]]:
        styles = list(instance.styles.all())
        if styles:
            return [get_raster_style(datalayer=instance, style=styles[0])]

        match instance.type:
            case DataLayerType.RASTER:
                stats = (
                    instance.info.get("stats", [])[0]
                    if instance.info
                    else {"min": 0, "max": 1}
                )
                nodata = instance.info.get("nodata") if instance.info else None
                if nodata is not None:
                    stats["nodata"] = nodata
                return [get_default_raster_style(**stats)]
            case _:
                return [get_default_vector_style()]

    def get_path(self, instance) -> Collection[str]:
        if instance.category:
            return instance.category._get_full_path()

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
            "simple_categories",
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
            "is_favorite",
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


class SearchTabSerializer(serializers.Serializer):
    """
    `search_tab` handling shared by find anything and browse. The favorites tab
    is scoped to a workspace the requester has access to.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["workspace_id"].queryset = get_available_workspaces_for_request(
            self.context.get("request"),
        )

    search_tab = serializers.ChoiceField(
        choices=SearchTab.choices,
        default=SearchTab.GENERAL,
        required=False,
    )

    workspace_id = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.none(),
        source="workspace",
        required=False,
        help_text="Workspace whose favorites are searched. "
        "Required when `search_tab` is `favorites`.",
    )

    def validate(self, attrs):
        if attrs.get("search_tab") in (
            SearchTab.FAVORITES,
            SearchTab.UPLOADED,
        ) and not attrs.get("workspace"):
            raise serializers.ValidationError(
                {"workspace_id": "This field is required for this tab."}
            )
        return attrs


class BrowseDataSetSerializer(SearchTabSerializer):
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


class BrowseDataLayersSerializer(BrowseDataSetSerializer):
    """
    Browse across every dataset. Only the workspace tabs (favorites, uploaded)
    are supported, since the general tab would return every accessible
    datalayer.
    """

    search_tab = serializers.ChoiceField(
        choices=[
            (SearchTab.FAVORITES.value, SearchTab.FAVORITES.label),
            (SearchTab.UPLOADED.value, SearchTab.UPLOADED.label),
        ],
    )


class FindAnythingSerializer(SearchTabSerializer):
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

    group_by = serializers.ChoiceField(
        choices=SearchGroupBy.choices,
        required=False,
        help_text="Group results by simple category or by dataset. "
        "Defaults to simple category when DATA_ORGANIZATION is on.",
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


class WorkspaceFavoriteDataLayerSerializer(
    serializers.ModelSerializer[WorkspaceFavoriteDataLayer]
):
    class Meta:
        model = WorkspaceFavoriteDataLayer
        fields = (
            "id",
            "workspace",
            "datalayer",
            "created_by",
            "created_at",
        )


class CreateWorkspaceDataLayerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=256)
    original_name = serializers.CharField(max_length=1024)
    size = serializers.IntegerField(min_value=1)

    def validate_original_name(self, value: str) -> str:
        from datasets.services import UPLOAD_EXTENSIONS

        if not value.lower().endswith(UPLOAD_EXTENSIONS):
            raise serializers.ValidationError(
                "Only GeoTIFF files (.tif, .tiff) are supported."
            )
        return value

    def validate_size(self, value: int) -> int:
        limit = settings.DATALAYER_UPLOAD_MAX_BYTES
        if value > limit:
            raise serializers.ValidationError(
                f"The file is larger than the {limit / 1024**3:g} GB limit."
            )
        return value

    def validate_name(self, value: str) -> str:
        from datasets.services import workspace_upload_name_taken

        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name can't be blank.")
        if workspace_upload_name_taken(self.context["workspace"], value):
            raise serializers.ValidationError(
                "A data layer with this name already exists in this workspace."
            )
        return value


class WorkspaceDataLayerSerializer(serializers.ModelSerializer[DataLayer]):
    creator_name = serializers.SerializerMethodField()

    def get_creator_name(self, instance: DataLayer) -> str:
        return instance.created_by.get_full_name() or instance.created_by.email

    class Meta:
        model = DataLayer
        fields = (
            "id",
            "uuid",
            "name",
            "type",
            "status",
            "failure_reason",
            "original_name",
            "file_size",
            "created_at",
            "updated_at",
            "created_by",
            "creator_name",
        )
        read_only_fields = fields


class WorkspaceDataLayerDetailSerializer(WorkspaceDataLayerSerializer):
    """
    The list row, plus the editable metadata, the style the layer is drawn
    with and the extent to show.
    """

    def to_representation(self, instance: DataLayer) -> Dict[str, Any]:
        from datasets.services import get_upload_style

        data = super().to_representation(instance)
        data.update(read_upload_metadata(instance.metadata))
        data["bbox"] = list(instance.geometry.extent) if instance.geometry else None
        custom_style = get_upload_style(instance)
        default_style = get_default_raster_style_for(instance)["data"]
        data["custom_style"] = custom_style is not None
        data["style"] = (
            get_raster_style(datalayer=instance, style=custom_style)["data"]
            if custom_style
            else default_style
        )
        # what the layer goes back to when the custom style is turned off
        data["default_style"] = default_style
        return data


HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


class UploadStyleEntrySerializer(serializers.Serializer):
    value = serializers.FloatField()
    color = serializers.RegexField(
        HEX_COLOR, error_messages={"invalid": "Use a color like #1a2b3c."}
    )
    label = serializers.CharField(max_length=64, required=False, allow_blank=True)

    def validate_value(self, value: float) -> float:
        if not math.isfinite(value):
            raise serializers.ValidationError("Enter a number.")
        return value


class UploadStyleSerializer(serializers.Serializer):
    map_type = serializers.ChoiceField(choices=["RAMP", "INTERVALS", "VALUES"])
    entries = UploadStyleEntrySerializer(many=True, min_length=1, max_length=20)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        values = [entry["value"] for entry in attrs["entries"]]
        if attrs["map_type"] != "VALUES" and len(values) < 2:
            raise serializers.ValidationError(
                {"entries": "Ramps and intervals need at least 2 breaks."}
            )
        if attrs["map_type"] == "VALUES":
            if len(set(values)) != len(values):
                raise serializers.ValidationError(
                    {"entries": "Each value can only appear once."}
                )
        elif any(a >= b for a, b in zip(values, values[1:])):
            raise serializers.ValidationError(
                {"entries": "Values must go from lowest to highest."}
            )
        return attrs


class UpdateWorkspaceDataLayerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=256, required=False)
    description = serializers.CharField(
        max_length=5000, required=False, allow_blank=True
    )
    units = serializers.CharField(max_length=128, required=False, allow_blank=True)
    vintage = serializers.CharField(max_length=64, required=False, allow_blank=True)
    geographic_coverage = serializers.CharField(
        max_length=256, required=False, allow_blank=True
    )
    # the tooltip links to it, so nothing but web links
    source_url = serializers.URLField(
        max_length=1024,
        required=False,
        allow_blank=True,
        validators=[URLValidator(schemes=["http", "https"])],
    )

    style = UploadStyleSerializer(required=False, allow_null=True)

    def validate_name(self, value: str) -> str:
        from datasets.services import workspace_upload_name_taken

        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name can't be blank.")
        datalayer = self.context["datalayer"]
        if workspace_upload_name_taken(
            datalayer.workspace, value, exclude_id=datalayer.pk
        ):
            raise serializers.ValidationError(
                "A data layer with this name already exists in this workspace."
            )
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        if self.context["datalayer"].status != DataLayerStatus.READY:
            raise serializers.ValidationError("Only ready data layers can be edited.")
        return attrs


class WorkspaceDataLayerCreatedSerializer(serializers.Serializer):
    datalayer = WorkspaceDataLayerSerializer()
    upload_to = serializers.JSONField()
