from base.region_name import RegionName
from django.contrib.gis.db.models.functions import Intersection
from django.db.models import F, Subquery
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets

from .models import Boundary, BoundaryDetails
from .serializers import BoundaryDetailsSerializer, BoundarySerializer

# Time to cache the boundary responses, in seconds.
CACHE_TIME_IN_SECONDS = 60 * 60 * 2


class BoundaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Boundary.objects.all().exclude(boundary_name="task_force_regions")
    serializer_class = BoundarySerializer


class BoundaryDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BoundaryDetails.objects.all()
    serializer_class = BoundaryDetailsSerializer

    def region_name_to_official_name(self, region: RegionName):
        """Returns the official name of the boundary."""
        match region:
            case RegionName.SIERRA_CASCADE_INYO:
                return "Sierra-Cascade-Inyo"
            case RegionName.NORTH_COAST_INLAND:
                return "North Coast-Inland"
            case RegionName.COASTAL_INLAND:
                return "Coastal-Inland"
            case RegionName.SOUTHERN_CALIFORNIA:
                return "Southern California"
            case _:
                raise ValueError("Unknown region name")

    def get_queryset(self):
        """
        Builds a query for the BoundaryDetails model that includes an additional
        'clipped_geometry' field.  If the region_name argument is not null, it looks
        up the boundary of that region, fetches the BoundaryDetails objects associated
        with the boundary_name within that region, and clips the geometries to the region.
        """
        boundary_name = self.request.GET.get("boundary_name", None)
        region_name = self.request.GET.get("region_name", None)
        if boundary_name is not None:
            if region_name is None:
                return BoundaryDetails.objects.filter(
                    boundary__boundary_name=boundary_name
                ).annotate(clipped_geometry=F("geometry"))

            database_region_name = self.region_name_to_official_name(
                RegionName(region_name)
            )
            region = BoundaryDetails.objects.filter(
                boundary__boundary_name="task_force_regions"
            ).filter(shape_name=database_region_name)
            return (
                BoundaryDetails.objects.filter(boundary__boundary_name=boundary_name)
                .annotate(region_boundary=Subquery(region.values("geometry")[:1]))
                .filter(geometry__intersects=F("region_boundary"))
                .annotate(
                    clipped_geometry=Intersection(F("geometry"), F("region_boundary"))
                )
            )

        return BoundaryDetails.objects.none()

    # The requests take O(10s) often to serialize, and boundaries don't change much.
    # Cache the results for CACHE_TIME_IN_SECONDS seconds.
    @method_decorator(cache_page(CACHE_TIME_IN_SECONDS))
    def list(self, request, *args, **kwargs):
        return super().list(self, request, *args, **kwargs)
