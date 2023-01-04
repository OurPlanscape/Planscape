from rest_framework_gis import serializers
from .models import Plan


class PlanSerializer(serializers.GeoFeatureModelSerializer):
    class Meta:
        fields = ("id", "owner", "name", "region_name", "public", "locked")
        model = Plan
        geo_field = "geometry"
