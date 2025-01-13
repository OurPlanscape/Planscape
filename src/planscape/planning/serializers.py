import json
from typing import List, Optional
from numpy import require
from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.contrib.gis.db.models import Union as UnionOp
from collaboration.services import get_role, get_permissions
from collaboration.permissions import PlanningAreaPermission
from planning.geometry import coerce_geometry
from planning.models import (
    PlanningArea,
    ProjectArea,
    ProjectAreaNote,
    Scenario,
    ScenarioResult,
    SharedLink,
    PlanningAreaNote,
    User,
    UserPrefs,
)
from planning.services import get_acreage, planning_area_covers, union_geojson
from planscape.exceptions import InvalidGeometry
from stands.models import Stand, StandSizeChoices


class ListPlanningAreaSerializer(serializers.ModelSerializer):
    scenario_count = serializers.IntegerField(
        read_only=True,
        required=False,
        help_text="Number of scenarios executed on the Planning Area.",
    )
    region_name = serializers.SerializerMethodField(
        help_text="Region choice name of the Planning Area."
    )
    # latest_updated takes into account the plan's scenario's updated timestamps and should
    # be used by clients rather than the row-level updated_at field.
    latest_updated = serializers.SerializerMethodField(
        help_text="Last update date and time in UTC."
    )
    notes = serializers.CharField(
        required=False, help_text="Notes of the Planning Area."
    )
    created_at = serializers.DateTimeField(
        required=False, help_text="Creation date and time in UTC."
    )

    area_acres = serializers.SerializerMethodField(
        help_text="Area of the Planning Area represented in Acres."
    )
    creator = serializers.CharField(
        source="creator_name", help_text="User ID that created the Planning Area."
    )
    permissions = serializers.SerializerMethodField(
        help_text="Requester permissions for the Planning Area."
    )
    role = serializers.SerializerMethodField(
        help_text="Requester role in the Planning Area."
    )

    def get_region_name(self, instance):
        return instance.get_region_name_display()

    def get_area_acres(self, instance):
        return get_acreage(instance.geometry)

    def get_latest_updated(self, instance):
        return (
            getattr(instance, "scenario_latest_updated_at", None) or instance.updated_at
        )

    def get_role(self, instance):
        user = self.context["request"].user or self.request.user
        return get_role(user, instance)

    def get_permissions(self, instance):
        user = self.context["request"].user or self.request.user
        return list(get_permissions(user, instance))

    class Meta:
        fields = (
            "id",
            "user",
            "name",
            "notes",
            "region_name",
            "scenario_count",
            "latest_updated",
            "created_at",
            "area_acres",
            "creator",
            "role",
            "permissions",
        )
        model = PlanningArea


class CreatePlanningAreaSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    def validate_geometry(self, geometry):
        if not isinstance(geometry, GEOSGeometry):
            geometry = GEOSGeometry(
                geometry,
                srid=settings.CRS_INTERNAL_REPRESENTATION,
            )

        if geometry.srid != settings.CRS_INTERNAL_REPRESENTATION:
            geometry = geometry.transform(
                settings.CRS_INTERNAL_REPRESENTATION, clone=True
            )

        try:
            geometry = coerce_geometry(geometry)
        except (InvalidGeometry, ValueError) as valEx:
            raise serializers.ValidationError(str(valEx))

        return geometry

    class Meta:
        model = PlanningArea
        fields = (
            "user",
            "name",
            "region_name",
            "geometry",
            "notes",
        )


class PlanningAreaSerializer(
    ListPlanningAreaSerializer,
    gis_serializers.GeoModelSerializer,
):
    class Meta:
        fields = (
            "id",
            "user",
            "name",
            "notes",
            "region_name",
            "scenario_count",
            "latest_updated",
            "created_at",
            "area_acres",
            "creator",
            "role",
            "permissions",
            "geometry",
        )
        model = PlanningArea
        geo_field = "geometry"


class ValidatePlanningAreaSerializer(gis_serializers.GeoModelSerializer):
    geometry = gis_serializers.GeometryField()

    def validate_geometry(self, geometry):
        try:
            geometry = coerce_geometry(geometry)
        except (InvalidGeometry, ValueError) as valEx:
            raise serializers.ValidationError(str(valEx))

        if not geometry.valid:
            raise serializers.ValidationError(str(geometry.valid_reason))

        if geometry.srid != settings.CRS_INTERNAL_REPRESENTATION:
            geometry = geometry.transform(
                settings.CRS_INTERNAL_REPRESENTATION, clone=True
            )

        return geometry

    class Meta:
        model = PlanningArea
        fields = ("geometry",)


class ValidatePlanningAreaOutputSerializer(serializers.Serializer):
    area_acres = serializers.FloatField()


class PlanningAreaNoteSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        validated_data["user"] = self.context["user"] or None
        return super().create(validated_data)

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "planning_area",
            "user_id",
            "user_name",
        )
        model = PlanningAreaNote


class PlanningAreaNoteListSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    def get_can_delete(self, obj):
        user = self.context.get("user")
        if user:
            return (user == obj.user) or (user == obj.planning_area.user)
        return False

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "planning_area",
            "user_id",
            "user_name",
            "can_delete",
        )
        model = PlanningAreaNote


class ScenarioResultSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "started_at",
            "completed_at",
            "status",
            "result",
            "run_details",
        )
        model = ScenarioResult


class ConfigurationSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(allow_null=True, required=False)
    weights = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=False,
    )
    est_cost = serializers.FloatField(
        min_value=1,
        default=2470,
        required=False,
    )
    max_budget = serializers.FloatField(
        allow_null=True,
        required=False,
    )
    max_slope = serializers.FloatField(
        min_value=0,
        max_value=100,
        allow_null=True,
        required=False,
    )
    min_distance_from_road = serializers.FloatField(
        min_value=0,
        max_value=100000,
        allow_null=True,
        required=False,
    )
    stand_size = serializers.ChoiceField(
        choices=StandSizeChoices.choices,
        default=StandSizeChoices.LARGE,
        required=False,
    )
    excluded_areas = serializers.ListField(
        child=serializers.CharField(max_length=256),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    stand_thresholds = serializers.ListField(
        child=serializers.CharField(max_length=512),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    global_thresholds = serializers.ListField(
        child=serializers.CharField(max_length=512),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    scenario_priorities = serializers.ListField(
        child=serializers.CharField(max_length=256),
        min_length=1,
        required=False,
    )
    scenario_output_fields = serializers.ListField(
        child=serializers.CharField(max_length=256),
        min_length=1,
        required=False,
    )
    max_treatment_area_ratio = serializers.FloatField(
        min_value=100,
        required=False,
    )

    def validate(self, attrs):
        budget = attrs.get("max_budget")
        max_area = attrs.get("max_treatment_area_ratio")

        if budget and max_area:
            raise serializers.ValidationError(
                "You should only provide `max_budget` or `max_treatment_area_ratio`."
            )

        if not budget and not max_area:
            raise serializers.ValidationError(
                "You should provide one of `max_budget` or `max_treatment_area_ratio`."
            )
        return attrs


class ListScenarioSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(required=False, help_text="Notes of the Scenario.")
    updated_at = serializers.DateTimeField(
        required=False, help_text="Last update date and time in UTC."
    )
    created_at = serializers.DateTimeField(
        required=False, help_text="Scenario creation date and time in UTC."
    )
    creator = serializers.CharField(
        source="creator_name",
        read_only=True,
        help_text="Name of the creator of the Scenario.",
    )
    tx_plan_count = serializers.SerializerMethodField(help_text="Number of treatments.")
    scenario_result = ScenarioResultSerializer(
        required=False,
        read_only=True,
        source="results",
        help_text="Results of the scenario.",
    )
    max_treatment_area = serializers.ReadOnlyField(
        source="configuration.max_treatment_area_ratio",
        help_text="Max Treatment Area Ratio.",
    )
    max_budget = serializers.ReadOnlyField(
        source="configuration.max_budget", help_text="Max budget."
    )

    bbox = serializers.SerializerMethodField()

    def get_bbox(self, instance) -> Optional[List[float]]:
        geometries = list(
            [
                Polygon.from_bbox(pa.extent)
                for pa in instance.project_areas.all().values_list(
                    "geometry", flat=True
                )
            ]
        )
        try:
            polygons = MultiPolygon(*geometries, srid=geometries[0].srid)
            if polygons.empty:
                return None
            geometry = polygons.unary_union
        except IndexError:
            return None
        if not geometry:
            return None
        if geometry.empty:
            return None
        return geometry.extent

    def get_tx_plan_count(self, obj):
        return obj.tx_plans.count()

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "max_treatment_area",
            "max_budget",
            "name",
            "notes",
            "user",
            "creator",
            "status",
            "scenario_result",
            "tx_plan_count",
            "bbox",
            "origin",
        )
        model = Scenario


class CreateScenarioSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Scenario
        fields = (
            "user",
            "planning_area",
            "name",
            "origin",
            "notes",
            "configuration",
        )


class UploadedConfigurationSerializer(serializers.Serializer):
    stand_size = serializers.ChoiceField(choices=StandSizeChoices.choices)


class ScenarioSerializer(
    ListScenarioSerializer,
    serializers.ModelSerializer,
):
    configuration = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        origin = None
        instance = kwargs.get("instance", None)
        if hasattr(self, "initial_data") and self.initial_data:
            origin = self.initial_data.get("origin")
        elif instance and hasattr(instance, "origin"):
            origin = instance.origin

        if origin == "USER":
            self.fields["configuration"] = UploadedConfigurationSerializer()
        else:
            self.fields["configuration"] = ConfigurationSerializer()

    def create(self, validated_data):
        validated_data["user"] = self.context["user"] or None
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["user"] = self.context["user"] or None
        return super().update(instance, validated_data)

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "name",
            "origin",
            "notes",
            "configuration",
            "scenario_result",
            "user",
            "creator",
            "status",
        )
        model = Scenario


class ProjectAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectArea
        fields = (
            "id",
            "scenario",
            "name",
            "data",
            "geometry",
            "created_by",
        )


class ScenarioAndProjectAreasSerializer(serializers.ModelSerializer):
    project_areas = ProjectAreaSerializer(many=True, read_only=True)

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "origin",
            "planning_area",
            "name",
            "notes",
            "user",
            "status",
            "project_areas",
        )
        model = Scenario


class SharedLinkSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        user = self.context["user"] or None
        # allow anonymous link creation, but don't include a user record on creation
        if user.is_anonymous or user is None:
            link_obj = SharedLink.objects.create(**validated_data)
        else:
            link_obj = SharedLink.objects.create(**validated_data, user=user)
        return link_obj

    class Meta:
        model = SharedLink
        fields = ("updated_at", "created_at", "link_code", "view_state", "user_id")


class UserPrefsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPrefs
        fields = ("updated_at", "created_at", "preferences", "user_id")


class ListCreatorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(
        help_text="Name of the creator of the Scenario.",
    )

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    class Meta:
        model = User
        fields = ("id", "email", "full_name")


class ProjectAreaNoteSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "project_area",
            "user_id",
            "user_name",
        )
        model = ProjectAreaNote


class ProjectAreaNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectAreaNote
        fields = ["content"]

    def create(self, validated_data):
        project_area_id = self.context["view"].kwargs.get("project_area_id")
        try:
            project_area = ProjectArea.objects.get(id=project_area_id)
        except ProjectArea.DoesNotExist:
            raise serializers.ValidationError("Invalid project_area_id")
        user = self.context["request"].user
        validated_data["project_area"] = project_area
        validated_data["user"] = user
        return super().create(validated_data)


class ProjectAreaNoteListSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    def get_can_delete(self, obj):
        user = self.context["request"].user
        if user:
            return (
                (user == obj.user)
                or (user == obj.project_area.scenario.planning_area.user)
                or PlanningAreaPermission.can_remove(
                    user, obj.project_area.scenario.planning_area
                )
            )

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "project_area",
            "user_id",
            "user_name",
            "can_delete",
        )
        model = ProjectAreaNote


class GeoJSONSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=[
            "Feature",
            "FeatureCollection",
            "GeometryCollection",
            "LineString",
            "MultiLineString",
            "MultiPoint",
            "MultiPolygon",
            "Point",
            "Polygon",
        ]
    )
    bbox = serializers.ListField(child=serializers.FloatField(), required=False)
    coordinates = serializers.ListField(required=False)
    geometry = serializers.JSONField(required=False)
    features = serializers.ListField(child=serializers.JSONField(), required=False)
    properties = serializers.JSONField(required=False)

    def validate(self, data):
        geojson_type = data.get("type")
        if geojson_type == "Feature":
            self._validate_feature(data)
        elif geojson_type == "FeatureCollection":
            self._validate_feature_collection(data)
        elif geojson_type in [
            "Polygon",
            "MultiPolygon",
            "LineString",
            "MultiLineString",
            "Point",
            "MultiPoint",
        ]:
            self._validate_geometry(data)
        return data

    def _validate_feature(self, data):
        if "geometry" not in data:
            raise serializers.ValidationError("Feature must have a geometry field.")
        if "features" in data:
            raise serializers.ValidationError("Feature cannot have a features field.")
        self._validate_geometry(data["geometry"])

    def _validate_feature_collection(self, data):
        if "features" not in data:
            raise serializers.ValidationError(
                "FeatureCollection must have a features field."
            )
        if "geometry" in data:
            raise serializers.ValidationError(
                "FeatureCollection cannot have a geometry field."
            )
        for feature in data["features"]:
            if "geometry" in feature:
                self._validate_geometry(feature["geometry"])

    def _validate_geometry(self, value):
        try:
            GEOSGeometry(json.dumps(value) if isinstance(value, dict) else value)
        except Exception as e:
            raise serializers.ValidationError(f"Invalid geometry: {str(e)}")


class UploadedScenarioDataSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=True)
    stand_size = serializers.ChoiceField(
        choices=["SMALL", "MEDIUM", "LARGE"], required=True
    )
    planning_area = serializers.IntegerField(min_value=1, required=True)
    geometry = serializers.JSONField(required=True)

    def validate(self, attrs):
        geometry = attrs.get("geometry")
        planning_area_id = attrs.get("planning_area")
        stand_size = attrs.get("stand_size")
        name = attrs.get("name")

        exists = Scenario.objects.filter(
            name=name,
            planning_area=planning_area_id,
        )
        if self.instance:
            exists = exists.exclude(pk=self.instance.pk)
            
        if exists.exists():
            raise serializers.ValidationError({
                'name': 'A scenario with this name already exists.'
            })

        if not self._is_inside_planning_area(geometry, planning_area_id, stand_size):
            raise serializers.ValidationError(
                "The uploaded geometry is not within the selected planning area."
            )
        return attrs

    def validate_geometry(self, value):
        # consolidate a list of feature collections into one object
        ## TODO: use built-in approaches for this
        if isinstance(value, list):
            merged_feature_collection = {"type": "FeatureCollection", "features": []}
            for fc in value:
                if fc.get("type") == "FeatureCollection":
                    merged_feature_collection["features"].extend(fc.get("features", []))
                else:
                    raise ValueError(
                        "All items must be GeoJSON FeatureCollection objects"
                    )
            value = merged_feature_collection

        # convert if neither dict nor list
        if not isinstance(value, (dict, list)):
            value = json.loads(value)

        geojson_serializer = GeoJSONSerializer(data=value)
        geojson_serializer.is_valid(raise_exception=True)
        return geojson_serializer.validated_data

    def _is_inside_planning_area(self, geometry, planning_area_id, stand_size) -> bool:
        uploaded_geos = union_geojson(geometry)
        try:
            planning_area = PlanningArea.objects.get(pk=planning_area_id)
        except PlanningArea.DoesNotExist:
            raise serializers.ValidationError("Planning area does not exist.")

        return planning_area_covers(
            planning_area=planning_area,
            geometry=uploaded_geos,
            stand_size=stand_size,
        )
