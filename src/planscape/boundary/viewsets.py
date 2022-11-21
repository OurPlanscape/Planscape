import json

from django.db.models import F, Subquery
from rest_framework import viewsets
from rest_framework_gis import filters
from django.core.serializers import serialize
from django.contrib.gis.db.models.functions import Intersection
from django.contrib.gis.geos import Polygon

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
        """
        Builds a query for the BoundaryDetails model that includes an additional
        'clipped_geometry' field.  If the region_name argument is not null, it looks
        up the boundary of that region, fetches the BoundaryDetails objects associated
        with the boundary_name within that region, and clips the geometries to the region.
        """
        boundary_name = self.request.GET.get("boundary_name", None)
        shape_name = self.regionNameToShapeName(
            self.request.GET.get("region_name", None))
        bbox = self.request.GET.get("bbox", None)
        bbox_polygon = None
        if bbox is not None:
            bbox_polygon = Polygon.from_bbox([float(v) for v in bbox.split(',')])
        if boundary_name is not None:
            if shape_name is None:
                return (BoundaryDetails.objects.filter(boundary__boundary_name=boundary_name)
                        .annotate(clipped_geometry=F('geometry')))

            region = (BoundaryDetails.objects.filter(boundary__boundary_name='task_force_regions')
                      .filter(shape_name=shape_name))
            boundaries = (BoundaryDetails.objects.filter(boundary__boundary_name=boundary_name)
                    .annotate(region_boundary=Subquery(region.values('geometry')[:1]))
                    .filter(geometry__intersects=F('region_boundary'))
                    .annotate(clipped_geometry=Intersection(F('geometry'), F('region_boundary'))))
            if bbox is not None:
                boundaries = boundaries.filter(geometry__bboverlaps=bbox_polygon)
            return boundaries

        return BoundaryDetails.objects.none()
