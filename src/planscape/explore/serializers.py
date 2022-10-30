from rest_framework_gis import serializers

from .models import TCSI_HUC12


class TCSI_HUC12Serializer(serializers.GeoFeatureModelSerializer):
    class Meta:
        fields = ("id", "name")
        geo_field = "geom"
        model = TCSI_HUC12