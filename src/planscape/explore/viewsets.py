"""Markers API views."""
from rest_framework import viewsets
from rest_framework_gis import filters
from django.core.serializers import serialize

from .models import Marker, TCSI_HUC12
from .serializers import MarkerSerializer, TCSI_HUC12Serializer


class MarkerViewSet(viewsets.ReadOnlyModelViewSet):
    bbox_filter_field = "location"
    filter_backends = (filters.InBBoxFilter,)
    queryset = Marker.objects.all()
    serializer_class = MarkerSerializer


class TCSI_HUC12ViewSet(viewsets.ReadOnlyModelViewSet):
    #bbox_filter_field = "sourceorig"
    #filter_backends = (filters.InBBoxFilter,)
    queryset = TCSI_HUC12.objects.all()
    print(queryset)
    serializer_class = TCSI_HUC12Serializer
