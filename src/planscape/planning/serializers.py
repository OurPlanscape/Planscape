from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers
from django.conf import settings
from collaboration.services import get_role, get_permissions
from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioResult,
    SharedLink,
    PlanningAreaNote,
)
from planning.services import get_acreage
from stands.models import StandSizeChoices


# TODO: flesh all serializers more for better maintainability.
class PlanningAreaSerializer(gis_serializers.GeoModelSerializer):
    scenario_count = serializers.IntegerField(read_only=True, required=False)
    region_name = serializers.SerializerMethodField()
    # latest_updated takes into account the plan's scenario's updated timestamps and should
    # be used by clients rather than the row-level updated_at field.
    latest_updated = serializers.SerializerMethodField()
    notes = serializers.CharField(required=False)
    created_at = serializers.DateTimeField(required=False)

    area_m2 = serializers.SerializerMethodField()
    area_acres = serializers.SerializerMethodField()
    creator = serializers.CharField(source="creator_name")
    permissions = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    def get_region_name(self, instance):
        return instance.get_region_name_display()

    def get_area_m2(self, instance):
        geom = instance.geometry.transform(settings.AREA_SRID, clone=True)
        return geom.area

    def get_area_acres(self, instance):
        return get_acreage(instance.geometry)

    def get_latest_updated(self, instance):
        return (
            getattr(instance, "scenario_latest_updated_at", None) or instance.updated_at
        )

    def get_role(self, instance):
        user = self.context["request"].user
        return get_role(user, instance)

    def get_permissions(self, instance):
        user = self.context["request"].user
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
            "area_m2",
            "area_acres",
            "creator",
            "role",
            "permissions",
            "geometry",
        )
        model = PlanningArea
        geo_field = "geometry"


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
            "user",
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
        min_value=500,
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


class ScenarioSerializer(serializers.ModelSerializer):
    configuration = ConfigurationSerializer()
    notes = serializers.CharField(required=False)
    updated_at = serializers.DateTimeField(required=False)
    created_at = serializers.DateTimeField(required=False)
    scenario_result = ScenarioResultSerializer(
        required=False,
        read_only=True,
        source="results",
    )

    creator = serializers.CharField(source="creator_name", read_only=True)

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
