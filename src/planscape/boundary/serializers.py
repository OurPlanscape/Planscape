from rest_framework_gis import serializers
from .models import Boundary, BoundaryDetails


class BoundarySerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "boundary_name")
        model = Boundary


class BoundaryDetailsSerializer(serializers.GeoFeatureModelSerializer):
    class Meta:
        fields = ("id", "shape_name")
        geo_field = "geometry"
        model = BoundaryDetails
