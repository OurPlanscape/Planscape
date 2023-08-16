from conditions.models import BaseCondition, Condition
from rest_framework import serializers
from rest_framework.serializers import IntegerField
from rest_framework_gis import serializers as gis_serializers

from planning.models import (PlanningArea, Scenario, ScenarioResult)

# TODO: flesh all serializers more for better maintainability.

class PlanningAreaSerializer(gis_serializers.GeoFeatureModelSerializer):
    class Meta:
        fields = ("id", "user", "name", "region_name")
        model = PlanningArea
        geo_field = "geometry"


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "planning_area", "name", "configuration")
        model = Scenario

class ScenarioResultSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "status", "result", "run_details")
        model = ScenarioResult
