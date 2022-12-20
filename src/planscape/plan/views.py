import json

from django.core import serializers
from django.contrib.gis.geos import GEOSGeometry
from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest, JsonResponse, QueryDict
from plan.models import Plan
from planscape import settings


def create(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = None
        if request.user.is_authenticated:
            owner = request.user
        if owner is None and not(settings.PLANSCAPE_GUEST_CAN_SAVE):
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
            region_name = 'sierra_cascade_inyo'

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

def get_plan_by_id(params: QueryDict):
    assert isinstance(params['id'], str)
    plan_id = params.get('id', 0)

    # Get plan from database
    plan = Plan.objects.get(pk=int(plan_id))

    # Convert to json object
    #serialized_plan = serializers.serialize('json', plan)
    #print(serialized_plan)
    username = plan.owner.get_username() if plan.owner is not None else ''
    return JsonResponse({'id': plan.pk, 'name': plan.name, 'owner': username, 'region_name': plan.region_name})
    

def get_plans_by_owner(params: QueryDict):
    # Get owner id
    owner_id = params.get('owner')

    # Read from database
    plans_list = None
    if owner_id is not None:
        plans_list = Plan.objects.filter(owner=owner_id)
    else:
        plans_list = Plan.objects.filter(owner=None)

    # Convert to json object
    serialized_plans = serializers.serialize('json', plans_list, many=True)
    return HttpResponse(serialized_plans, content_type="text/json-comment-filtered")



def list_plans_by_owner(request: HttpRequest) -> HttpResponse:
    try: 
        plans = get_plans_by_owner(request.GET)
        return HttpResponse(plans, content_type=request.GET['format'])
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))

def get_plan(request: HttpRequest) -> HttpResponse:
    try:
        return get_plan_by_id(request.GET)
        #return HttpResponse(plan)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))