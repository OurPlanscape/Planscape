import datetime
import json

from base.region_name import (RegionName, display_name_to_region,
                              region_to_display_name)
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Count
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
        region_name_input = body.get('region_name', 'Sierra Nevada')
        region_name = display_name_to_region(region_name_input)
        if region_name is None:
            raise ValueError("Unknown region_name: " + region_name_input)

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
        return HttpResponseBadRequest("Error in create: " + str(e))


def delete(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = None
        if request.user.is_authenticated:
            owner = request.user
        if owner is None and not (settings.PLANSCAPE_GUEST_CAN_SAVE):
            raise ValueError("Must be logged in")
        owner_id = None if owner is None else owner.pk

        # Get the plans
        body = json.loads(request.body)
        plan_id = body.get('id', None)
        plan_ids = []
        if plan_id is None:
            raise ValueError("Must specify plan_id")
        elif isinstance(plan_id, int):
            plan_ids = [plan_id]
        elif isinstance(plan_id, str):
            plan_ids = [int(x) for x in plan_id.split(',')]
        else:
            raise ValueError("Bad plan_id: " + plan_id)

        # Get the plans, and if the user is logged in, make sure either
        # 1. the plan owner and the owner are both None, or
        # 2. the plan owner and the owner are both not None, and are equal.
        plans = Plan.objects.filter(pk__in=plan_ids)
        for plan in plans:
            plan_owner_id = None if plan.owner is None else plan.owner.pk
            if owner_id != plan_owner_id:
                raise ValueError(
                    "Cannot delete plan; plan is not owned by user")
        for plan in plans:
            plan.delete()
        return HttpResponse(plan_id)
    except Exception as e:
        return HttpResponseBadRequest("Error in delete: " + str(e))


def get_plan_by_id(params: QueryDict):
    assert isinstance(params['id'], str)
    plan_id = params.get('id', 0)
    return (Plan.objects.filter(id=int(plan_id))
                        .annotate(projects=Count('project', distinct=True))
                        .annotate(scenarios=Count('project__scenario')))


def get_plans_by_owner(params: QueryDict):
    owner_id = params.get('owner')
    return (Plan.objects.filter(owner=owner_id)
            .annotate(projects=Count('project', distinct=True))
            .annotate(scenarios=Count('project__scenario')))


def _serialize_plan(plan: Plan, add_geometry: bool) -> dict:
    """
    Serializes a Plan into a dictionary.
    1. Converts the Plan to a dictionary with fields 'id', 'geometry', and 'properties'
       (the latter of which is a dictionary).
    2. Creates the partial result from the properties and 'id' fields.
    3. Replaces 'creation_time' with a Posix timestamp.
    4. Adds the 'geometry' if requested.
    5. Replaces the internal region_name with the display version.
    """
    data = PlanSerializer(plan).data
    result = data['properties']
    result['id'] = data['id']
    if 'creation_time' in result:
        result['creation_timestamp'] = datetime.datetime.fromisoformat(
            result['creation_time'].replace('Z', '+00:00')).timestamp()
        del result['creation_time']
    if 'geometry' in data and add_geometry:
        result['geometry'] = data['geometry']
    if 'region_name' in result:
        result['region_name'] = region_to_display_name(result['region_name'])
    return result


def get_plan(request: HttpRequest) -> HttpResponse:
    try:
        return JsonResponse(_serialize_plan(get_plan_by_id(request.GET)[0], True))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def list_plans_by_owner(request: HttpRequest) -> HttpResponse:
    try:
        plans = get_plans_by_owner(request.GET)
        return JsonResponse([_serialize_plan(plan, False) for plan in plans], safe=False)
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
            raise ValueError("Must specify plan_id as an integer")

        # Get the plan, and if the user is logged in, make sure either
        # 1. the plan owner and the owner are both None, or
        # 2. the plan owner and the owner are both not None, and are equal.
        plan = Plan.objects.get(pk=int(plan_id))
        if not ((owner is None and plan.owner is None) or
                (owner is not None and plan.owner is not None and owner.pk == plan.owner.pk)):
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
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
