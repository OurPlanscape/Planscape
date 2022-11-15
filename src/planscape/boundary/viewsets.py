from rest_framework import viewsets
from rest_framework_gis import filters
from django.core.serializers import serialize
from typing import Optional

from .models import Boundary, BoundaryDetails
from .serializers import BoundarySerializer, BoundaryDetailsSerializer


class BoundaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Boundary.objects.all()
    serializer_class = BoundarySerializer


class BoundaryDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BoundaryDetails.objects.all()
    serializer_class = BoundaryDetailsSerializer

    def regionNameToShapeName(self, region_name):
        if region_name is not None:
            if region_name == 'SierraNevada':
                return 'Sierra-Cascade-Inyo'
            elif region_name == 'CentralCoast':
                return 'Coastal-Inland'
            elif region_name == 'NorthernCalifornia':
                return 'North Coast-Inland'
            elif region_name == 'SouthernCalifornia':
                return 'Southern California'
        return None

    def get_queryset(self):
        boundary_name = self.request.GET.get("boundary_name", None)
        shape_name = self.regionNameToShapeName(
            self.request.GET.get("region_name", None))
        if boundary_name is not None:
            objects = BoundaryDetails.objects.filter(
                boundary__boundary_name=boundary_name)
            if shape_name is not None:
                region = BoundaryDetails.objects.filter(
                    boundary__boundary_name='task_force_regions')
                region = region.filter(shape_name=shape_name)
                geometry = region[0].geometry
                objects = objects.filter(geometry__intersects=geometry)
            return objects

        return BoundaryDetails.objects.none()
