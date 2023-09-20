from conditions.models import BaseCondition, Condition
from rest_framework import serializers
from rest_framework.serializers import IntegerField
from rest_framework_gis import serializers as gis_serializers

from .models import Plan, Project, ProjectArea, Scenario, ScenarioWeightedPriority


class PlanSerializer(gis_serializers.GeoFeatureModelSerializer):
    projects = IntegerField(read_only=True, required=False)
    scenarios = IntegerField(read_only=True, required=False)

    class Meta:
        fields = (
            "id",
            "owner",
            "name",
            "region_name",
            "public",
            "locked",
            "creation_time",
            "projects",
            "scenarios",
        )
        model = Plan
        geo_field = "geometry"


class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = "__all__"


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = "__all__"


class ScenarioWeightedPrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioWeightedPriority
        fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    priorities = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="id"
    )

    class Meta:
        model = Project
        fields = "__all__"


class ProjectAreaSerializer(gis_serializers.GeoFeatureModelSerializer):
    class Meta:
        model = ProjectArea
        fields = "__all__"
        geo_field = "project_area"
