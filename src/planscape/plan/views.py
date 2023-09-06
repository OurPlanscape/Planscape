import datetime
import json
import logging
import os

import boto3
from base.condition_types import ConditionScoreType
from base.region_name import display_name_to_region, region_to_display_name
from conditions.models import BaseCondition, Condition
from conditions.raster_utils import fetch_or_compute_condition_stats
from config.treatment_goals_config import TreatmentGoalsConfig
from django.conf import settings as djangoSettings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from django.db.models import Count
from django.db.models.query import QuerySet
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)
from django.views.decorators.csrf import csrf_exempt
from plan.models import (Plan, Project, ProjectArea, Scenario,
                         ScenarioWeightedPriority)
from plan.serializers import (PlanSerializer, ProjectAreaSerializer,
                              ProjectSerializer, ScenarioSerializer,
                              ScenarioWeightedPrioritySerializer)
from planscape import settings

# TODO: remove csrf_exempt decorators when logged in users are required.
# TODO: disallow calls if not logged in as user

MAX_BUDGET = 'max_budget'
MAX_TREATMENT_AREA_RATIO = 'max_treatment_area_ratio'
MAX_ROAD_DIST = 'max_road_distance'
MAX_SLOPE = 'max_slope'
PRIORITIES = 'priorities'

# Configure global logging.
logger = logging.getLogger(__name__)

# Global variable for the BoundaryConfig, so that the configuration file is read once.
treatment_goals_config = TreatmentGoalsConfig(
    os.path.join(djangoSettings.BASE_DIR, 'config/treatment_goals.json'))

def get_user(request: HttpRequest) -> User:
    user = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    if user is None and not (settings.PLANSCAPE_GUEST_CAN_SAVE):
        raise ValueError("Must be logged in")
    return user


def get_scenario_by_id(
        user: User, id_url_param: str, params: QueryDict) -> Scenario:
    assert isinstance(params[id_url_param], str)
    scenario_id = params.get(id_url_param, "0")
    scenario = Scenario.objects.select_related(
        'project').get(id=scenario_id)

    if scenario.owner != user:
        raise ValueError(
            "You do not have permission to view this scenario.")
    return scenario


def get_plan_by_id(user, id_url_param: str, params: QueryDict):
    assert isinstance(params[id_url_param], str)
    plan_id = params.get(id_url_param, "0")

    plan = Plan.objects.annotate(
        projects=Count('project', distinct=True)).annotate(
        scenarios=Count('project__scenario')).get(
        id=int(plan_id))
    if plan.owner != user:
        raise ValueError("You do not have permission to view this plan.")
    return plan


def get_project_by_id(user: User, id_url_param: str,
                      params: QueryDict) -> Project:
    assert isinstance(params[id_url_param], str)
    project_id = params.get(id_url_param, "0")
    project = Project.objects.get(id=project_id)
    if project.owner != user:
        raise ValueError("You do not have permission to view this project.")
    return project


@csrf_exempt
def create_plan(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

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

        # Get the geometry of the plan.
        geometry = body.get('geometry', None)
        if geometry is None:
            raise ValueError("Must specify geometry")
        # Convert to a MultiPolygon if it is a simple Polygon, since the model column type is
        # MultiPolygon.
        # If this fails, the rest of the clause is skipped.
        geometry = _convert_polygon_to_multipolygon(geometry)

        # Create the plan
        plan = Plan.objects.create(
            owner=owner, name=name, region_name=region_name, geometry=geometry)
        plan.save()
        return HttpResponse(str(plan.pk))
    except Exception as e:
        return HttpResponseBadRequest("Error in create: " + str(e))


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


@csrf_exempt
def delete(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)
        owner_id = None if owner is None else owner.pk

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
            raise ValueError("Bad plan id: " + plan_id)

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
        response_data = {'id': plan_ids}
        return HttpResponse(
            json.dumps(response_data),
            content_type="application/json")
    except Exception as e:
        return HttpResponseBadRequest("Error in delete: " + str(e))


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
        result['creation_timestamp'] = round(datetime.datetime.fromisoformat(
            result['creation_time'].replace('Z', '+00:00')).timestamp())
        del result['creation_time']
    if 'geometry' in data and add_geometry:
        result['geometry'] = data['geometry']
    if 'region_name' in result:
        result['region_name'] = region_to_display_name(result['region_name'])
    return result


def get_plan(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)

        return JsonResponse(
            _serialize_plan(
                get_plan_by_id(user, 'id', request.GET),
                True))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def list_plans_by_owner(request: HttpRequest) -> HttpResponse:
    try:
        owner_id = None
        owner_str = request.GET.get('owner')
        if owner_str is not None:
            owner_id = int(owner_str)
        elif request.user.is_authenticated:
            owner_id = request.user.pk
        plans = (Plan.objects.filter(owner=owner_id)
                 .annotate(projects=Count('project', distinct=True))
                 .annotate(scenarios=Count('project__scenario')))
        return JsonResponse(
            [_serialize_plan(plan, True) for plan in plans],
            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


# TODO: add validation for requiring either max budget or max area to be set for a generation run
def _validate_constraint_values(
        max_budget, max_treatment_area_ratio, max_road_distance, max_slope):
    if max_budget is not None and not (isinstance(max_budget, (int, float))):
        raise ValueError("Max budget must be a number value")

    if (max_treatment_area_ratio is not None and
            (not (isinstance(max_treatment_area_ratio, (int, float))) or max_treatment_area_ratio < 0)):
        raise ValueError(
            "Max treatment must be a number value >= 0.0")

    if max_road_distance is not None and not (
            isinstance(max_road_distance, (int, float))):
        raise ValueError("Max distance from road must be a number value")

    if (max_slope is not None and
            (not (isinstance(max_slope, (int, float))) or max_slope < 0)):
        raise ValueError(
            "Max slope must be a number value >= 0.0")


def _set_project_parameters(
        max_budget, max_treatment_area_ratio, max_road_distance, max_slope,
        project: Project):
    project.max_budget = float(max_budget) if max_budget else None
    project.max_treatment_area_ratio = float(
        max_treatment_area_ratio) if max_treatment_area_ratio else None
    project.max_road_distance = float(
        max_road_distance) if max_road_distance else None
    project.max_slope = float(max_slope) if max_slope else None


def _set_priorities(priorities, project: Project):
    if priorities is not None:
        for i in range(len(priorities)):
            base_condition = BaseCondition.objects.get(
                condition_name=priorities[i])
            # is_raw=False required because for metrics, we store both current raw and current normalized data.
            condition = Condition.objects.get(
                condition_dataset=base_condition,
                condition_score_type=ConditionScoreType.CURRENT, is_raw=False)
            project.priorities.add(condition)


@csrf_exempt
def create_project(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

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

        max_budget = body.get(MAX_BUDGET, None)
        max_treatment_area_ratio = body.get(MAX_TREATMENT_AREA_RATIO, None)
        max_road_distance = body.get(MAX_ROAD_DIST, None)
        max_slope = body.get(MAX_SLOPE, None)
        priorities = body.get(PRIORITIES, None)

        _validate_constraint_values(
            max_budget, max_treatment_area_ratio, max_road_distance, max_slope)

        project = Project.objects.create(owner=owner, plan=plan)
        _set_project_parameters(max_budget, max_treatment_area_ratio,
                                max_road_distance, max_slope, project)
        _set_priorities(priorities, project)
        project.save()
        return HttpResponse(str(project.pk))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def update_project(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

        body = json.loads(request.body)
        project_id = body.get('id', None)
        if project_id is None or not (isinstance(project_id, int)):
            raise ValueError("Must specify project_id as an integer")

        project = Project.objects.get(id=project_id)
        if project.owner != owner:
            raise ValueError(
                "You do not have permission to view this project.")

        max_budget = body.get(MAX_BUDGET, None)
        max_treatment_area_ratio = body.get(MAX_TREATMENT_AREA_RATIO, None)
        max_road_distance = body.get(MAX_ROAD_DIST, None)
        max_slope = body.get(MAX_SLOPE, None)
        priorities = body.get(PRIORITIES, None)

        _validate_constraint_values(
            max_budget, max_treatment_area_ratio, max_road_distance, max_slope)

        if request.method == "PUT":
            project.priorities.clear()
            _set_project_parameters(max_budget, max_treatment_area_ratio,
                                    max_road_distance, max_slope, project)
            _set_priorities(priorities, project)
        elif request.method == "PATCH":
            del body['id']
            body.pop('priorities', None)
            s = ProjectSerializer(project, data=body, partial=True)
            s.is_valid(raise_exception=True)
            s.save()

            if priorities is not None:
                project.priorities.clear()
                _set_priorities(priorities, project)
        else:
            raise KeyError(
                "HTTP methods other than PUT are not yet implemented")
        project.save()
        return HttpResponse(str(project.pk))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def list_projects_for_plan(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['plan_id'], str)
        plan_id = request.GET.get('plan_id', "0")

        user = get_user(request)

        if Plan.objects.get(pk=plan_id) is None:
            raise ValueError("Plan with id " +
                             str(plan_id) + " does not exist")

        projects = Project.objects.filter(owner=user, plan=int(plan_id))

        return JsonResponse([_serialize_project(project)
                             for project in projects],
                            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def get_project(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)
        project = get_project_by_id(user, 'id', request.GET)
        return JsonResponse(_serialize_project(project))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def _serialize_project(project: Project) -> dict:
    """
    Serializes a Project into a dictionary.
    1. Replaces 'creation_time' with a Posix timestamp.
    2. Replaces the priority IDs with the condition name.
    """
    result = ProjectSerializer(project).data
    if 'creation_time' in result and result['creation_time'] is not None:
        result['creation_timestamp'] = round(datetime.datetime.fromisoformat(
            result['creation_time'].replace('Z', '+00:00')).timestamp())
        del result['creation_time']
    if 'priorities' in result:
        result['priorities'] = [Condition.objects.get(
            pk=priority).condition_dataset.condition_name for priority in result['priorities']]
    return result


@csrf_exempt
def delete_projects(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

        body = json.loads(request.body)
        project_ids = body.get('project_ids', None)
        if project_ids is None or not (isinstance(project_ids, list)):
            raise ValueError("Must specify project_ids as a list")

        projects = [Project.objects.get(id=project_id)
                    for project_id in project_ids]

        # Check that the user owns the projects
        for project in projects:
            if project.owner != owner:
                raise ValueError(
                    "You do not have permission to delete one or more of these projects.")

        for project in projects:
            project.delete()

        response_data = project_ids
        return HttpResponse(
            json.dumps(response_data),
            content_type="application/json")

    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def create_project_area(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

        body = json.loads(request.body)

        # Get the project_id. This may come from an existing project or a
        # placeholder project created for 1 forsys with patchmax run)
        project_id = body.get('project_id', None)
        if project_id is None or not (isinstance(project_id, int)):
            raise ValueError("Must specify project_id as an integer")

        # Get the Project, and if the user is logged in, make sure either
        # 1. the Project owner and the owner are both None, or
        # 2. the Project owner and the owner are both not None, and are equal.
        project = Project.objects.get(pk=int(project_id))
        if not ((owner is None and project.owner is None) or
                (owner is not None and project.owner is not None and owner.pk == project.owner.pk)):
            raise ValueError(
                "Cannot create project; plan is not owned by user")

        # Get the geometry of the Project.
        geometry = body.get('geometry', None)
        if geometry is None:
            raise ValueError("Must specify geometry")
        # Convert to a MultiPolygon if it is a simple Polygon, since the model column type is
        # MultiPolygon.
        # If this fails, the rest of the clause is skipped.
        geometry = _convert_polygon_to_multipolygon(geometry)

        # TODO: Optionally save scenario pk

        project_area = ProjectArea.objects.create(
            owner=owner, project=project, project_area=geometry)
        project_area.save()
        return HttpResponse(str(project_area.pk))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))

# TODO: consolidate create_project_areas API to one call


@csrf_exempt
def create_project_areas_for_project(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

        body = json.loads(request.body)

        # Get the project_id. This may come from an existing project or a
        # placeholder project created for 1 forsys with patchmax run)
        project_id = body.get('project_id', None)
        if project_id is None or not (isinstance(project_id, int)):
            raise ValueError("Must specify project_id as an integer")

        # Get the Project, and if the user is logged in, make sure either
        # 1. the Project owner and the owner are both None, or
        # 2. the Project owner and the owner are both not None, and are equal.
        project = Project.objects.get(pk=int(project_id))
        if not ((owner is None and project.owner is None) or
                (owner is not None and project.owner is not None and owner.pk == project.owner.pk)):
            raise ValueError(
                "Cannot create project area; project is not owned by user")

        # Get the geometry of the Project.
        geometries = body.get('geometries', None)
        if geometries is None:
            raise ValueError("Must specify geometries")
        # Convert to a MultiPolygon if it is a simple Polygon, since the model column type is
        # MultiPolygon.
        # If this fails, the rest of the clause is skipped.
        polygons = []
        for geometry in geometries:
            polygon = _convert_polygon_to_multipolygon(geometry)
            polygons.append(polygon)

        project_areas = ProjectArea.objects.bulk_create([ProjectArea(**{
            'owner': owner,
            'project': project,
            'project_area': p})
            for p in polygons])

        return JsonResponse([area.pk for area in project_areas], safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def _serialize_project_areas(areas: QuerySet):
    response = {}
    for area in areas:
        data = ProjectAreaSerializer(area).data
        response[data['id']] = data
    return response


def get_project_areas(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)
        project = get_project_by_id(user, 'project_id', request.GET)
        project_areas = ProjectArea.objects.filter(project=project.pk)
        response = _serialize_project_areas(project_areas)
        return JsonResponse(response)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def _set_scenario_metadata(priorities, weights, notes, scenario: Scenario):
    scenario.notes = notes if notes else None

    for i in range(len(priorities)):
        base_condition = BaseCondition.objects.get(
            condition_name=priorities[i])
        # is_raw=False required because for metrics, we store both current raw and current normalized data.
        condition = Condition.objects.get(
            condition_dataset=base_condition,
            condition_score_type=ConditionScoreType.CURRENT, is_raw=False)
        weight = weights[i] if weights is not None else None
        weighted_pri = ScenarioWeightedPriority.objects.create(
            scenario=scenario, priority=condition, weight=weight)


def get_treatment_goals_config_for_region(params: QueryDict):
    # Get region name
    assert isinstance(params['region_name'], str)
    region_name = params['region_name']
    
    # Read from treatment_goals config
    config_path = os.path.join(
        djangoSettings.BASE_DIR, 'config/treatment_goals.json')
    treatment_goals_config = json.load(open(config_path, 'r'))


    for region in treatment_goals_config['regions']:
        if region_name == region['region_name']:
            return region['treatment_goals']
        
    return None

def treatment_goals_config(request: HttpRequest) -> HttpResponse:
    treatment_goals = get_treatment_goals_config_for_region(request.GET)
    return JsonResponse(treatment_goals, safe = False)

def _create_scenario(request: HttpRequest):
    # Check that the user is logged in.
    owner = get_user(request)

    body = json.loads(request.body)

    # TODO: remove plan_id as required field in request. can be derived from project_id
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
            "Cannot create scenario; plan is not owned by user")

    project_id = body.get('project_id', None)
    if project_id is None or not (isinstance(project_id, int)):
        raise ValueError("Must specify project_id as an integer")

    # Get the project, and if the user is logged in, make sure either
    # 1. the project owner and the owner are both None, or
    # 2. the project owner and the owner are both not None, and are equal.
    project = Project.objects.get(pk=int(project_id))
    if not ((owner is None and project.owner is None) or
            (owner is not None and project.owner is not None and owner.pk == project.owner.pk)):
        raise ValueError(
            "Cannot create scenario; project is not owned by user")

    priorities = body.get('priorities', None)
    weights = body.get('weights', None)
    notes = body.get('notes', None)

    if priorities is None:
        raise ValueError(
            "At least one priority must be selected.")
    if weights is None:
        raise ValueError(
            "Scenario must have weights for priorites")
    if (len(priorities) != len(weights)):
        raise ValueError(
            "Each priority must have a single assigned weight")

    scenario = Scenario.objects.create(
        owner=owner, plan=plan, project=project)
    _set_scenario_metadata(priorities, weights, notes, scenario)
    scenario.save()
    return scenario


# TODO: create scenario for project instead of plan
@csrf_exempt
def create_scenario(request: HttpRequest) -> HttpResponse:
    try:
        scenario = _create_scenario(request)
        return HttpResponse(str(scenario.pk))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def update_scenario(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

        body = json.loads(request.body)
        scenario_id = body.get('id', None)
        if scenario_id is None or not (isinstance(scenario_id, int)):
            raise ValueError("Must specify scenario_id as an integer")

        scenario = Scenario.objects.get(id=scenario_id)
        if scenario.owner != owner:
            raise ValueError(
                "You do not have permission to update this scenario.")

        notes = body.get("notes", None)
        status = body.get("status", None)

        if notes is not None and not (isinstance(notes, str)):
            raise ValueError("Notes must be a string value")

        if status is not None and not (isinstance(status, int)):
            raise ValueError("Status must be a valid ScenarioStatus option")

        if request.method == "PATCH":
            s = ScenarioSerializer(scenario, data=body, partial=True)
            s.is_valid(raise_exception=True)
            s.save()
        else:
            raise KeyError(
                "HTTP methods other than PATCH are not yet implemented")
        scenario.save()
        return JsonResponse({'updated': scenario.pk})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def _serialize_scenario(scenario: Scenario, weights: QuerySet, areas: QuerySet,
                        project: Project) -> dict:
    result = ScenarioSerializer(scenario).data

    if 'creation_time' in result:
        result['creation_timestamp'] = round(datetime.datetime.fromisoformat(
            result['creation_time'].replace('Z', '+00:00')).timestamp())
        del result['creation_time']

    result['priorities'] = {}
    for weight in weights:
        serialized_weight = ScenarioWeightedPrioritySerializer(weight).data
        if 'priority' in serialized_weight and 'weight' in serialized_weight:
            result['priorities'][
                Condition.objects.get(pk=serialized_weight['priority']).
                condition_dataset.condition_name] = serialized_weight['weight']

    result['project_areas'] = _serialize_project_areas(areas)
    # TODO: project should be a required field
    if project is not None:
        result['config'] = _serialize_project(project)

    return result


@csrf_exempt
def get_scenario(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)
        scenario = get_scenario_by_id(user, 'id', request.GET)

        weights = ScenarioWeightedPriority.objects.filter(scenario=scenario)
        project_areas = ProjectArea.objects.filter(project=scenario.project.pk)

        return JsonResponse(
            _serialize_scenario(
                scenario, weights, project_areas, scenario.project),
            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def list_scenarios_for_plan(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['plan_id'], str)
        plan_id = request.GET.get('plan_id', "0")
        plan = Plan.objects.get(id=plan_id)

        user = get_user(request)

        if plan.owner != user:
            raise ValueError(
                "You do not have permission to view scenarios for this plan.")

        scenarios = Scenario.objects.select_related(
            'project').filter(owner=user, plan=plan_id)

        return JsonResponse(
            [_serialize_scenario(scenario,
                                 weights=ScenarioWeightedPriority.objects.filter(
                                     scenario=scenario),
                                 areas=ProjectArea.objects.filter(project=scenario.project.pk), project=scenario.project)
             for scenario in scenarios], safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def delete_scenarios(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

        body = json.loads(request.body)
        scenario_ids = body.get('scenario_ids', None)
        if scenario_ids is None or not (isinstance(scenario_ids, list)):
            raise ValueError("Must specify scenario_ids as a list")

        scenarios = [Scenario.objects.get(pk=scenario_id)
                     for scenario_id in scenario_ids]

        # Check that the user owns the scenarios
        for scenario in scenarios:
            if scenario.owner != owner:
                raise ValueError(
                    "You do not have permission to delete one or more of these scenarios.")

        for scenario in scenarios:
            scenario.delete()

        response_data = scenario_ids
        return HttpResponse(
            json.dumps(response_data),
            content_type="application/json")
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def favorite_scenario(request: HttpRequest) -> HttpResponse:
    try:
        body = json.loads(request.body)
        scenario_id = body.get('scenario_id', None)
        if scenario_id is None or not (isinstance(scenario_id, int)):
            raise ValueError("Must specify scenario_id as an integer")

        scenario = Scenario.objects.get(pk=int(scenario_id))

        user = get_user(request)
        if scenario.owner != user:
            raise ValueError(
                "You do not have permission to favorite this scenario.")

        scenario.favorited = True
        scenario.save()

        return JsonResponse({'favorited': True})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def unfavorite_scenario(request: HttpRequest) -> HttpResponse:
    try:
        body = json.loads(request.body)
        scenario_id = body.get('scenario_id', None)
        if scenario_id is None or not (isinstance(scenario_id, int)):
            raise ValueError("Must specify scenario_id as an integer")

        scenario = Scenario.objects.get(pk=int(scenario_id))

        user = get_user(request)
        if scenario.owner != user:
            raise ValueError(
                "You do not have permission to unfavorite this scenario.")

        scenario.favorited = False
        scenario.save()

        return JsonResponse({'favorited': False})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def get_scores(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)
        plan = get_plan_by_id(user, 'id', request.GET)

        condition_stats = fetch_or_compute_condition_stats(plan)
        conditions = []
        for c in condition_stats.keys():
            score = condition_stats[c]["mean"]
            if score is None:
                conditions.append({'condition': c})
            else:
                conditions.append({'condition': c, 'mean_score': score})

        response = {'conditions': conditions}
        return HttpResponse(
            JsonResponse(response),
            content_type='application/json')

    except Exception as e:
        return HttpResponseBadRequest("failed score fetch: " + str(e))


# NOTE: To send a queue message from your local machine, populate AWS credentials.
# TODO: Add tests that mock SQS calls
# Example POST body (the specific priorities below are required as input, weights can be modified):
# {
# 	"plan_id": 200,
# 	"project_id" : 127,
# 	"priorities" : ["california_spotted_owl", "storage", "functional_fire", "forest_structure", "max_sdi"],
# 	"weights" : [1, 2, 3, 4, 5]
# }
@csrf_exempt
def queue_forsys_lambda_prototype(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)
        scenario_id = _create_scenario(request)
        user_id = "Guest" if user is None else str(user.pk)

        update_scenario = {
            'user_id': user_id,
            'scenario_id': str(scenario_id),
        }
        client = boto3.client('sqs', region_name='us-west-1')
        response = client.send_message(
            QueueUrl='https://sqs.us-west-1.amazonaws.com/705618310400/forsys.fifo',
            MessageBody=json.dumps(update_scenario),
            MessageGroupId=user_id
        )
        return JsonResponse({
            'statusCode': 200,
            'messageId': response['MessageId']
        })

    except Exception as e:
        return HttpResponseBadRequest(str(e))
