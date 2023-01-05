from rest_framework.serializers import IntegerField
from rest_framework_gis import serializers

from .models import Plan


class PlanSerializer(serializers.GeoFeatureModelSerializer):
    projects = IntegerField(read_only=True, required=False)
    scenarios = IntegerField(read_only=True, required=False)

    class Meta:
        fields = ("id", "owner", "name", "region_name", "public",
                  "locked", "creation_time", "projects", "scenarios")
        model = Plan
        geo_field = "geometry"
