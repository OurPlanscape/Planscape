from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from collaboration.services import get_role, get_permissions
from planning.geometry import coerce_geometry
from planning.models import (
    PlanningArea,
    ProjectArea,
    Scenario,
    ScenarioResult,
    SharedLink,
    PlanningAreaNote,
    User,
    UserPrefs,
)
from planning.services import get_acreage
from stands.models import StandSizeChoices


class ListPlanningAreaSerializer(serializers.ModelSerializer):
    scenario_count = serializers.IntegerField(read_only=True, required=False)
    region_name = serializers.SerializerMethodField()
    # latest_updated takes into account the plan's scenario's updated timestamps and should
    # be used by clients rather than the row-level updated_at field.
    latest_updated = serializers.SerializerMethodField()
    notes = serializers.CharField(required=False)
    created_at = serializers.DateTimeField(required=False)

    area_acres = serializers.SerializerMethodField()
    creator = serializers.CharField(source="creator_name")
    permissions = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

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
        except ValueError as valEx:
            raise serializers.ValidationError(str(valEx))
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
    weights = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)
    est_cost = serializers.FloatField(min_value=1)
    max_budget = serializers.FloatField(
        allow_null=True,
        required=False,
    )
    max_slope = serializers.FloatField(
        min_value=1,
        max_value=100,
        allow_null=True,
    )
    min_distance_from_road = serializers.FloatField(
        min_value=1,
        max_value=100000,
        allow_null=True,
    )
    stand_size = serializers.ChoiceField(choices=StandSizeChoices.choices)
    excluded_areas = serializers.ListField(
        child=serializers.CharField(max_length=256),
        allow_empty=True,
        min_length=0,
    )
    stand_thresholds = serializers.ListField(
        child=serializers.CharField(max_length=512),
        allow_empty=True,
        min_length=0,
    )
    global_thresholds = serializers.ListField(
        child=serializers.CharField(max_length=512),
        allow_empty=True,
        min_length=0,
    )
    scenario_priorities = serializers.ListField(
        child=serializers.CharField(max_length=256),
        min_length=1,
    )
    scenario_output_fields = serializers.ListField(
        child=serializers.CharField(max_length=256),
        min_length=1,
    )
    max_treatment_area_ratio = serializers.FloatField(
        min_value=100,
        required=False,
    )

    def validate(self, data):
        budget = data.get("max_budget")
        max_area = data.get("max_treatment_area_ratio")

        if budget and max_area:
            raise serializers.ValidationError(
                "You should only provide `max_budget` or `max_treatment_area_ratio`."
            )

        if not budget and not max_area:
            raise serializers.ValidationError(
                "You should provide one of `max_budget` or `max_treatment_area_ratio`."
            )
        return data


class ListScenarioSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(required=False)
    updated_at = serializers.DateTimeField(required=False)
    created_at = serializers.DateTimeField(required=False)
    creator = serializers.CharField(source="creator_name", read_only=True)
    scenario_result = ScenarioResultSerializer(
        required=False,
        read_only=True,
        source="results",
    )

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "name",
            "notes",
            "user",
            "creator",
            "status",
            "scenario_result",
            "configuration",
        )
        model = Scenario


class ScenarioSerializer(
    ListScenarioSerializer,
    serializers.ModelSerializer,
):
    configuration = ConfigurationSerializer()

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
            "notes",
            "configuration",
            "scenario_result",
            "user",
            "creator",
            "status",
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
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    class Meta:
        model = User
        fields = ("id", "email", "full_name")


class ProjectAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectArea
        fields = (
            "uuid",
            "scenario",
            "name",
            "origin",
            "data",
            "geometry",
        )
