from rest_framework import viewsets
from rest_framework_gis import filters
from django.core.serializers import serialize

from .models import TCSI_HUC12
from .serializers import TCSI_HUC12Serializer


class TCSI_HUC12ViewSet(viewsets.ReadOnlyModelViewSet):
    #bbox_filter_field = "sourceorig"
    #filter_backends = (filters.InBBoxFilter,)
    queryset = TCSI_HUC12.objects.all()
    serializer_class = TCSI_HUC12Serializer
