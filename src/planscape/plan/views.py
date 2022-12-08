import json

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import requires_csrf_token
from plan.models import Plan
from base.region_name import RegionName


@requires_csrf_token
def create(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = None
        if request.user.is_authenticated:
            owner = request.user
        if owner is None:
            raise ValueError("Must be logged in")

        # Get the name of the plan.
        body = json.loads(request.body)
        name = body.get('name', None)
        if name is None:
            raise ValueError("Must specify name")

        # Get the region name
        # TODO Reconsider default of Sierra Nevada region.
        region_name = body.get('region_name', None)
        if region_name is None:
            region_name = str(RegionName.SIERRA_CASCADE_INYO)

        # Get the geometry of the plan.  Convert it to a MultiPolygon
        # if it is a simple Polygon, since the model column type is
        # MultiPolygon.
        geometry = body.get('geometry', None)
        if geometry is None:
            raise ValueError("Must specify geometry")
        features = geometry.get('features', [])
        if len(features) > 1 or len(features) == 0:
            raise ValueError("Must send exactly one feature.")
        feature = features[0]
        geom = feature['geometry']
        if geom['type'] == 'Polygon':
            geom['type'] = 'MultiPolygon'
            geom['coordinates'] = [feature['geometry']['coordinates']]
        geometry = GEOSGeometry(json.dumps(geom))
        if geometry.geom_type != 'MultiPolygon':
            raise ValueError("Could not parse geometry")

        # Create the plan
        plan = Plan.objects.create(
            owner=owner, name=name, region_name=region_name, geometry=geometry)
        plan.save()
        return HttpResponse(str(plan.pk))

    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
