from conditions.models import BaseCondition, Condition
from rest_framework import serializers
from rest_framework.serializers import CharField, DateTimeField, IntegerField, JSONField
from rest_framework_gis import serializers as gis_serializers

from planning.models import PlanningArea, Scenario, ScenarioResult, SharedLink
from planning.services import validate_scenario_treatment_ratio
from stands.models import StandSizeChoices


# TODO: flesh all serializers more for better maintainability.
class PlanningAreaSerializer(gis_serializers.GeoFeatureModelSerializer):
    scenario_count = IntegerField(read_only=True, required=False)

    # latest_updated takes into account the plan's scenario's updated timestamps and should
    # be used by clients rather than the row-level updated_at field.
    latest_updated = serializers.SerializerMethodField()
    notes = CharField(required=False)
    created_at = DateTimeField(required=False)

    def get_latest_updated(self, instance):
        return instance.scenario_latest_updated_at or instance.updated_at

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
        )
        model = PlanningArea
        geo_field = "geometry"


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
    notes = CharField(required=False)
    updated_at = DateTimeField(required=False)
    created_at = DateTimeField(required=False)
    scenario_result = ScenarioResultSerializer(
        required=False,
        read_only=True,
        source="results",
    )

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
        )
        model = Scenario


class SharedLinkSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        user = self.context["user"] or None
        # allow anonymous link creation, but don't include a user record on creatoin
        if user.is_anonymous or user is None:
            link_obj = SharedLink.objects.create(**validated_data)
        else:
            link_obj = SharedLink.objects.create(**validated_data, user=user)
        return link_obj

    class Meta:
        model = SharedLink
        fields = ("updated_at", "created_at", "link_code", "view_state", "user_id")
