import datetime
import json

import boto3
from base.condition_types import ConditionScoreType
from base.region_name import display_name_to_region, region_to_display_name
from conditions.models import BaseCondition, Condition
from conditions.raster_utils import fetch_or_compute_condition_stats
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Count
from django.db.models.query import QuerySet
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from planning.models import (PlanningArea)
from planning.serializers import (PlanningAreaSerializer)
from planscape import settings


# Retrieve the logged in user from the HTTP request.
def _get_user(request: HttpRequest) -> User:
    user = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    return user


# We always need to store multipolygons, so coerce a single polygon to
# a multigolygon if needed.
def _convert_polygon_to_multipolygon(geometry: dict):
    features = geometry.get('features', [])
    if len(features) > 1 or len(features) == 0:
        raise ValueError("Must send exactly one feature.")
    feature = features[0]
    geom = feature['geometry']
    if geom['type'] == 'Polygon':
        geom['type'] = 'MultiPolygon'
        geom['coordinates'] = [feature['geometry']['coordinates']]
    actual_geometry = GEOSGeometry(json.dumps(geom))
    if actual_geometry.geom_type != 'MultiPolygon':
        raise ValueError("Could not parse geometry")
    return actual_geometry

# TODO: Along with PlanningAreaSerializer, refactor this a bit more to
# make it more maintainable.
def _serialize_plan(plan: PlanningArea, add_geometry: bool) -> dict:
    """
    Serializes a Plan into a dictionary.
    1. Converts the Plan to a dictionary with fields 'id', 'geometry', and 'properties'
       (the latter of which is a dictionary).
    2. Creates the partial result from the properties and 'id' fields.
    3. Adds the 'geometry' if requested.
    4. Replaces the internal region_name with the display version.
    """
    data = PlanningAreaSerializer(plan).data
    result = data['properties']
    result['id'] = data['id']
    if 'geometry' in data and add_geometry:
        result['geometry'] = data['geometry']
    if 'region_name' in result:
        result['region_name'] = region_to_display_name(result['region_name'])
    return result


#### PLAN(NING AREA) Handlers ####

# Requires a logged in user (from the session), a plan name, a region name, and a geometry.
def create_plan(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")
        
        # Get the name of the plan.
        body = json.loads(request.body)
        name = body.get('name')
        if name is None:
            raise ValueError("Must specify a plan name.")

        # Get the region name; it should be in the human-readable display name format.
        region_name_input = body.get('region_name')
        if region_name_input is None:
            raise ValueError("Region name must be specified.")
        
        region_name = display_name_to_region(region_name_input)
        if region_name is None:
            raise ValueError("Unknown region_name: " + region_name_input)

        # Get the geometry of the plan.
        geometry = body.get('geometry')
        if geometry is None:
            raise ValueError("Must specify the plan geometry.")

        # Convert to a MultiPolygon if it is a simple Polygon, since the model column type is
        # MultiPolygon.
        geometry = _convert_polygon_to_multipolygon(geometry)

        # Create the plan
        plan = PlanningArea.objects.create(
            user=user, name=name, region_name=region_name, geometry=geometry)
        plan.save()
        return HttpResponse(str(plan.pk))
    except Exception as e:
        return HttpResponseBadRequest("Error in create: " + str(e))


# Supports deleting a whole list of plans.
# Plans are deleteable only by their owners.
# PlanIDs not belonging to the user are silently not deleted.
def delete_plan(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")
        user_id = user.pk

        # Get the plans                                                                                                                                 
        body = json.loads(request.body)
        plan_id = body.get('id', None)
        plan_ids = []
        if plan_id is None:
            raise ValueError("Must specify plan id")
        elif isinstance(plan_id, int):
            plan_ids = [plan_id]
        elif isinstance(plan_id, list):
            plan_ids = plan_id
        else:
            raise ValueError("Plan ID must be an int or a list of ints.")

        # Get the plan(s) for just the logged in user.
        plans = user.planning_areas.filter(pk__in=plan_ids)

        plans.delete()

        # We still report that the full set of plan IDs requested were deleted,
        # since from the user's perspective, there are no plans with that ID.
        # no plan, with the end result is that those plans don't exist as far
        # as the user is concerned.
        response_data = {'id': plan_ids}

        return HttpResponse(
            json.dumps(response_data),
            content_type="application/json")
    except Exception as e:
        return HttpResponseBadRequest("Error in delete: " + str(e))


# User can see only their own plans.
def get_plan_by_id(request: HttpRequest) -> HttpResponse:
    try:
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")
        user_id = user.pk

        return JsonResponse(
            _serialize_plan(
                get_object_or_404(user.planning_areas, id=request.GET['id']),
                True))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


# No Params expected, since we're always using the logged in user.
def list_plans(request: HttpRequest) -> HttpResponse:
    try:
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")
        user_id = user.pk

# TODO: This could be really slow; consider paging or perhaps
# fetching everything but geometries (since they're huge) for performance gains.
        plans = PlanningArea.objects.filter(user=user_id)
        return JsonResponse(
            [_serialize_plan(plan, False) for plan in plans],
            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))

