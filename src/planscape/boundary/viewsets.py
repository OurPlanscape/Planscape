from rest_framework import viewsets
from rest_framework_gis import filters
from django.core.serializers import serialize
from typing import Optional

from .models import Boundary, BoundaryDetails
from .serializers import BoundarySerializer, BoundaryDetailsSerializer


class BoundaryViewSet(viewsets.ReadOnlyModelViewSet):
    #bbox_filter_field = "sourceorig"
    #filter_backends = (filters.InBBoxFilter,)
    queryset = Boundary.objects.all()
    serializer_class = BoundarySerializer


class BoundaryDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    #bbox_filter_field = "sourceorig"
    #filter_backends = (filters.InBBoxFilter,)
    queryset = BoundaryDetails.objects.all()
    serializer_class = BoundaryDetailsSerializer

    def get_queryset(self):
        boundary_name = self.request.GET.get("boundary_name", None)
        if boundary_name is not None:
            return BoundaryDetails.objects.filter(boundary__boundary_name=boundary_name)

        return BoundaryDetails.objects.none()
