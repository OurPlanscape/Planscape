"""Markers serializers."""

from rest_framework_gis import serializers

from .models import Marker, TCSI_HUC12


class MarkerSerializer(serializers.GeoFeatureModelSerializer):
    """Marker GeoJSON serializer."""

    class Meta:
        """Marker serializer meta class."""

        fields = ("id", "name")
        geo_field = "location"
        model = Marker


class TCSI_HUC12Serializer(serializers.GeoFeatureModelSerializer):
    class Meta:
        fields = ("id", "name")
        geo_field = "geom"
        model = TCSI_HUC12