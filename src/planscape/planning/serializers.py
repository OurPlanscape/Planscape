from conditions.models import BaseCondition, Condition
from rest_framework import serializers
from rest_framework.serializers import IntegerField
from rest_framework_gis import serializers as gis_serializers

from .models import (PlanningArea, Scenario)


class PlanningAreaSerializer(gis_serializers.GeoFeatureModelSerializer):
    class Meta:
        fields = ("id", "user", "name", "region_name")
        model = PlanningArea
        geo_field = "geometry"

class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = '__all__'
