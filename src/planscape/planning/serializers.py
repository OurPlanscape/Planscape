from conditions.models import BaseCondition, Condition
from rest_framework import serializers
from rest_framework.serializers import CharField, DateTimeField, IntegerField, JSONField
from rest_framework_gis import serializers as gis_serializers

from planning.models import PlanningArea, Scenario, ScenarioResult


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


class ScenarioSerializer(serializers.ModelSerializer):
    configuration = JSONField()
    notes = CharField(required=False)
    updated_at = DateTimeField(required=False)
    created_at = DateTimeField(required=False)

    class Meta:
        fields = (
            "id",
            "planning_area",
            "name",
            "notes",
            "configuration",
            "updated_at",
            "created_at",
        )
        model = Scenario


class ScenarioResultSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "status", "result", "run_details")
        model = ScenarioResult
