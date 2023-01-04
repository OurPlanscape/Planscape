import json

from django.contrib.gis.geos import GEOSGeometry
from django.core import serializers
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)
from plan.models import Plan, Project
from plan.serializers import PlanSerializer
from planscape import settings


def create(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = None
        if request.user.is_authenticated:
            owner = request.user
        if owner is None and not (settings.PLANSCAPE_GUEST_CAN_SAVE):
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
    return Plan.objects.get(pk=int(plan_id))


def get_plans_by_owner(params: QueryDict):
    owner_id = params.get('owner')
    return Plan.objects.filter(owner=owner_id)


def _serialize_plan(plan: Plan):
    data = PlanSerializer(plan).data
    result = data['properties']
    result.update({'id': data['id'], 'geometry': data['geometry']})
    return result


def get_plan(request: HttpRequest) -> HttpResponse:
    try:
        return JsonResponse(_serialize_plan(get_plan_by_id(request.GET)))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def list_plans_by_owner(request: HttpRequest) -> HttpResponse:
    try:
        plans = get_plans_by_owner(request.GET)
        return JsonResponse([_serialize_plan(plan) for plan in plans], safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def create_project(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = None
        if request.user.is_authenticated:
            owner = request.user
        if owner is None and not (settings.PLANSCAPE_GUEST_CAN_SAVE):
            raise ValueError("Must be logged in")

        # Get the plan_id associated with the project.
        body = json.loads(request.body)
        plan_id = body.get('plan_id', None)
        if plan_id is None or not (isinstance(plan_id, int)):
            print(plan_id)
            raise ValueError("Must specify plan_id as an integer")

        # Get the plan, and if the user is logged in, make sure either
        # 1. the plan owner and the owner are both None, or
        # 2. the plan owner and the owner are both not None, and are equal.
        plan = Plan.objects.get(pk=int(plan_id))
        if not ((owner is None and plan.owner is None) or
                (owner is not None and plan.owner is not None and owner.pk==plan.owner.pk)):
            raise ValueError(
                "Cannot create project; plan is not owned by user")

        # Get the max_cost parameter.
        # TODO: Add more parameters as necessary.
        max_cost = body.get('max_cost', None)

        # Create the project.
        project = Project.objects.create(
            owner=owner, plan=plan, max_cost=max_cost)
        project.save()
        return HttpResponse(str(project.pk))
    except Exception as e:
        print(e)
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
