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
from planning.models import (PlanningArea, Scenario, ScenarioResult, ScenarioResultStatus)
from planning.serializers import (PlanningAreaSerializer, ScenarioSerializer, ScenarioResultSerializer)
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

def create_plan(request: HttpRequest) -> HttpResponse:
    """
    Creates a planning area (aka plan), given a name, region, and an optional geometry.
    Requires a logged in user.

    Returns: the newly inserted planning area's primary key (int).

    Required params:
      name (str): User-provided name of the planning area.
      region_name (str): The region name, in user-facing form, e.g. "Sierra Nevada"
      geometry (JSON str): The planning area shape, in GEOGeometry-compatible JSON.
    """
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


def delete_plan(request: HttpRequest) -> HttpResponse:
    """
    Deletes a planning area or areas.
    Requires a logged in user.  Users can delete only their owned plans.
    Deletion of a plans not owned by the user will not generate an error but will not delete anything.
    Deletion attempts of nonexistent plans will not generate an error but will also not delete anything.

    Returns: The list of IDs entered, including those IDs that failed to matched a user-owned plan.

    Required params:
      id (int): ID of the planning area to delete, or a list of IDs to delete.
    """
    try:
        # Check that the user is logged in.
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")

        # Get the plan IDs
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
    """
    Retrieves a planning area by ID.
    Requires a logged in user.  Users can see only their owned plans.

    Returns: The planning area in JSON form.

    Required params:
      id (int): ID of the planning area to retrieve.
    """
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
    """
    Retrieves all planning areas for a user.
    Requires a logged in user.  Users can see only their owned plans.

    Returns: A list of planning areas in JSON form.

    Required params: none
    """
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



#### SCENARIO Handlers ####

def _serialize_scenario(scenario: Scenario, scenario_result: ScenarioResult | None) -> dict:
    """
    Serializes a Scenario into a dictionary.
    # TODO: Add more logic here as our Scenario model expands beyond just the
    #       JSON "configuration" field.
    """
    data = ScenarioSerializer(scenario).data
    if scenario_result:
        data['result'] = ScenarioResultSerializer(scenario_result).data

    return data


# Scenario can be retrieved by a user's plan.
# This also can return the result as well, optionally.
def get_scenario_by_id(request: HttpRequest) -> HttpResponse:
    """
    Retrieves a scenario by its ID.
    Requires a logged in user.  Users can see only scenarios belonging to their own plans.

    Returns: A scenario in JSON form.

    Required params:
      id (int): The scenario ID to be retrieved.
    """
    try:
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")

        show_results = request.GET.get('show_results', False)

        scenario = Scenario.objects.select_related('planning_area__user').get(id=request.GET['id'])
        if (scenario.planning_area.user.pk != user.pk):
            # This matches the same error string if the planning area doesn't exist in the DB for any user.
            raise ValueError("Scenario matching query does not exist.")

        scenario_result = None
        if show_results:
            scenario_result = ScenarioResult.objects.get(scenario__id=scenario.pk)

        return JsonResponse(
            _serialize_scenario(scenario, scenario_result),
            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))

def create_scenario(request: HttpRequest) -> HttpResponse:
    """
    Creates a Scenario.  This also creates a default (e.g. mostly empty) ScenarioResult associated with the scenario.
    Requires a logged in user, as a scenario must be associated with a user's planning area.

    Returns: the ID of the newly inserted Scenario.

    Required params:
      name (str): The user-provided name of the Scenario.
      planning_area (int): The ID of the planning area that will recieve the new Scenario.
      configuration (str): A JSON string representing the scenario configuration (e.g. query parameters, weights).
    """
    try:
        # Check that the user is logged in.
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")

        body = json.loads(request.body)

        # Check for all needed fields
        serializer = ScenarioSerializer(data=body)
        serializer.is_valid(raise_exception=True)

        # Ensure that we have a viable plan owned by the user.  Note that this gives a slightly different
        # error response for a nonowned plan vs. when given a nonexistent plan.
        plan = get_object_or_404(user.planning_areas, id=body['planning_area'])

        # TODO: Parse configuration field into further components.

        scenario = serializer.save()

        # Create a default scenario result.
        # Note that if this fails, we will have still written the Scenario without
        # a corresponding ScenarioResult.
        scenario_result = ScenarioResult.objects.create(
            scenario=scenario)
        scenario_result.save()

        return HttpResponse(str(scenario.pk))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))

#TODO - when we want to support multiple scenario results for the same scenario:
#def create_result_for_scenario(request: HttpRequest) -> HttpResponse:
#def list_results_for_scenario(request: HttpRequest) -> HttpResponse:

# TODO: add more things to update other than state
# Unlike other routines, this does not require a user login context, as it is expected to be called
# by the EP.
#
# TODO: require credential from EP so that random people cannot call this endpoint.
def update_scenario_result(request: HttpRequest) -> HttpResponse:
    """
    Updates a ScenarioResult.
    Requires a logged in user, as a scenario must be associated with a user's planning area.
    Throws an error if no scenario/ScenarioResult owned by the user can be found with the desired ID.
    This does not modify the Scenario object itself.
    A ScenarioResult's status can be updated only in the following directions:
       PENDING -> RUNNING | FAILURE
       RUNNING -> SUCCESS | FAILURE

    Returns: the ID of the Scenario whose ScenarioResult was updated.

    Required params:
      scenario_id (int): The scenario ID whose ScenarioResult is meant to be updated.

    Optional params:
      status (ScenarioResultStatus): The new status of the ScenarioResult.
      result (JSON str): Details of the run.
      run_details (JSON str): Even more verbose details of the run.
    """
    try:
        body = json.loads(request.body)
        scenario_id = body.get('scenario_id')

        scenario_result = ScenarioResult.objects.get(scenario__id=scenario_id)
        
        new_status = body.get('status')
        old_status = scenario_result.status
        
        if new_status is not None:
            match new_status:
                case ScenarioResultStatus.RUNNING:
                    if old_status != ScenarioResultStatus.PENDING:
                        raise ValueError("Invalid new state.")
                case ScenarioResultStatus.SUCCESS:
                    if old_status != ScenarioResultStatus.RUNNING:
                        raise ValueError("Invalid new state.")
                case _:
                    if new_status != ScenarioResultStatus.FAILURE:
                        raise ValueError("Invalid new state.")
            scenario_result.status = new_status
            
        if (run_details := body.get('run_details')) is not None:
            scenario_result.run_details = run_details
 
        if (result := body.get('result')) is not None:
            scenario_result.result = result
            
        scenario_result.save()

        return HttpResponse(str(scenario_id))
    except Exception as e:
        return HttpResponseBadRequest("Update Scenario error: " + str(e))


# This returns the empty set if given a plan that has no scenarios,
# a plan that isn't owned by the user, or a planID that doesn't exist.
def list_scenarios_for_plan(request: HttpRequest) -> HttpResponse:
    """
    Lists all Scenarios for a Plan.
    Requires a logged in user, as a scenario must be associated with a user's planning area.

    Returns: a list of the scenarios for the user.  Can return the empty list.  Will return an empty list
      if given a plan that has no scenarios, a plan that isn't owned by the user, or a plan ID that doesn't exist.

    Required params:
      planning_area (int): The planning area ID whose scenarios to retrieve.
    """
    try:
        # Check that the user is logged in.
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")

        plan_id = request.GET['planning_area']
        if plan_id is None:
            raise ValueError("Missing planning_area")

        scenarios = Scenario.objects.filter(planning_area__user_id=user.pk).filter(planning_area__pk=plan_id)
        
        return JsonResponse(
            [_serialize_scenario(scenario, None) for scenario in scenarios],
            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("List Scenario error: " + str(e))

# Can delete multiple scenarios at once.
# Deletion attempts for someone else's scenario will silently do nothing with those scenarios.
# Deletion attempts for a nonexistent scenario silently does nothing.
def delete_scenario(request: HttpRequest) -> HttpResponse:
    """
    Deletes a scenario or list of scenarios for a plan owned by the user.
    Requires a logged in user, as a scenario must be associated with a user's planning area.

    Returns: the list of IDs to be deleted.  Scenarios that do not exist or do not belong to a plan that
      is owned by the user will appear in the returned list.

    Required params:
      scenario_id (int): The ID of the scenario (or list of IDs) to delete.
    """
    try:
        # Check that the user is logged in.
        user = _get_user(request)
        if user is None:
            raise ValueError("User must be logged in.")
        
        body = json.loads(request.body)
        scenario_id_str = body.get('scenario_id', None)
        if scenario_id_str is None:
            raise ValueError("Must specify scenario id(s)")

        scenario_ids = []
        if isinstance(scenario_id_str, int):
            scenario_ids = [scenario_id_str]
        elif isinstance(scenario_ids, list):
            scenario_ids = scenario_id_str
        else:
            raise ValueError("scenario_id must be an int or a list of ints.")

        # Get the scenarios matching the provided IDs and the logged-in user.
        scenarios = Scenario.objects.filter(pk__in=scenario_ids).filter(planning_area__user=user.pk)
        # This automatically deletes ScenarioResult entries for the deleted Scenarios.
        scenarios.delete()

        # We still report that the full set of scenario IDs requested were deleted,
        # since from the user's perspective, there are no scenarios with that ID after this
        # call completes.
        response_data = {'id': scenario_ids}

        return HttpResponse(
            json.dumps(response_data),
            content_type="application/json")
    except Exception as e:
        return HttpResponseBadRequest("Delete Scenario error: " + str(e))
