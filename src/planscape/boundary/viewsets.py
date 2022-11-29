from typing import Optional

from django.contrib.gis.db.models.functions import Intersection
from django.db.models import F, Subquery
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets

from .models import Boundary, BoundaryDetails
from .serializers import BoundaryDetailsSerializer, BoundarySerializer


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
        """
        Builds a query for the BoundaryDetails model that includes an additional
        'clipped_geometry' field.  If the region_name argument is not null, it looks
        up the boundary of that region, fetches the BoundaryDetails objects associated
        with the boundary_name within that region, and clips the geometries to the region.
        """
        boundary_name = self.request.GET.get("boundary_name", None)
        shape_name = self.regionNameToShapeName(
            self.request.GET.get("region_name", None))
        if boundary_name is not None:
            if shape_name is None:
                return (BoundaryDetails.objects.filter(boundary__boundary_name=boundary_name)
                        .annotate(clipped_geometry=F('geometry')))

            region = BoundaryDetails.objects.filter(
                boundary__boundary_name='task_force_regions').filter(shape_name=shape_name)
            return (BoundaryDetails.objects.filter(boundary__boundary_name=boundary_name)
                    .annotate(region_boundary=Subquery(region.values('geometry')[:1]))
                    .filter(geometry__intersects=F('region_boundary'))
                    .annotate(clipped_geometry=Intersection(F('geometry'), F('region_boundary'))))

        return BoundaryDetails.objects.none()

    # The requests take O(10s) often to serialize, and boundaries don't change much.
    # Cache the results for 60*60*2 seconds = 2 hours.
    @method_decorator(cache_page(60*60*2))
    def list(self, request, *args, **kwargs):
        return super().list(self, request, *args, **kwargs)
