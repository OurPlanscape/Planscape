from rest_framework_gis import serializers
from .models import Boundary, BoundaryDetails


class BoundarySerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "boundary_name", "display_name", "region_name")
        model = Boundary


class BoundaryDetailsSerializer(serializers.GeoFeatureModelSerializer):
    clipped_geometry = serializers.GeometryField()

    class Meta:
        fields = ("id", "shape_name")
        geo_field = "clipped_geometry"
        model = BoundaryDetails
