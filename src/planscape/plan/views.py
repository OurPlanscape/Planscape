import datetime
import json

from base.condition_types import ConditionScoreType
from base.region_name import display_name_to_region, region_to_display_name
from conditions.models import BaseCondition, Condition
from conditions.raster_utils import fetch_or_compute_condition_stats
from django.contrib.gis.geos import GEOSGeometry
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


def get_user(request: HttpRequest):
    user = None
    if request.user.is_authenticated:
        user = request.user
    if user is None and not (settings.PLANSCAPE_GUEST_CAN_SAVE):
        raise ValueError("Must be logged in")
    return user


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


def get_plan_by_id(user, params: QueryDict):
    assert isinstance(params['id'], str)
    plan_id = params.get('id', "0")

    plan = Plan.objects.annotate(
        projects=Count('project', distinct=True)).annotate(
        scenarios=Count('project__scenario')).get(
        id=int(plan_id))
    if plan.owner != user:
        raise ValueError("You do not have permission to view this plan.")
    return plan


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
                get_plan_by_id(user, request.GET),
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
            [_serialize_plan(plan, False) for plan in plans],
            safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


# TODO: add validation for requiring either max budget or max area to be set for a generation run
def _validate_constraint_values(max_budget, max_treatment_area_ratio, max_road_distance, max_slope):
    if max_budget is not None and not (isinstance(max_budget, (int, float))):
        raise ValueError("Max budget must be a number value")

    if (max_treatment_area_ratio is not None and
            (not (isinstance(max_treatment_area_ratio, (int, float))) or max_treatment_area_ratio < 0)):
        raise ValueError(
            "Max treatment must be a number value >= 0.0")

    if max_road_distance is not None and not (isinstance(max_road_distance, (int, float))):
        raise ValueError("Max distance from road must be a number value")

    if (max_slope is not None and
            (not (isinstance(max_slope, (int, float))) or max_slope < 0)):
        raise ValueError(
            "Max slope must be a number value >= 0.0")


def _set_project_parameters(max_budget, max_treatment_area_ratio, max_road_distance,
                            max_slope, project: Project):
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
                condition_dataset=base_condition, condition_score_type=ConditionScoreType.CURRENT, is_raw=False)
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

        max_budget = body.get('max_budget', None)
        max_treatment_area_ratio = body.get('max_treatment_area_ratio', None)
        max_road_distance = body.get('max_road_distance', None)
        max_slope = body.get('max_slope', None)
        priorities = body.get('priorities', None)

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
        
        max_budget = body.get('max_budget', None)
        max_treatment_area_ratio = body.get('max_treatment_area_ratio', None)
        max_road_distance = body.get('max_road_distance', None)
        max_slope = body.get('max_slope', None)
        priorities = body.get('priorities', None)

        _validate_constraint_values(
            max_budget, max_treatment_area_ratio, max_road_distance, max_slope)
        
        if request.method == "PUT":
            project.priorities.clear()
            _set_project_parameters(max_budget, max_treatment_area_ratio,
                                    max_road_distance, max_slope, project)
            _set_priorities(priorities, project)
            project.save()
            return HttpResponse(str(project.pk))
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

        return JsonResponse([_serialize_project(project) for project in projects], safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def get_project(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['id'], str)
        project_id = request.GET.get('id', "0")

        user = get_user(request)

        project = Project.objects.get(id=project_id)
        if project.owner != user:
            raise ValueError(
                "You do not have permission to view this project.")

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


def get_project_areas(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['project_id'], str)
        project_id = request.GET.get('project_id', "0")
        project_exists = Project.objects.get(id=project_id)

        user = get_user(request)

        if project_exists.owner != user:
            raise ValueError(
                "You do not have permission to view this project.")

        project_areas = ProjectArea.objects.filter(project=project_id)
        response = {}
        for area in project_areas:
            data = ProjectAreaSerializer(area).data
            response[data['id']] = data
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
            condition_dataset=base_condition, condition_score_type=ConditionScoreType.CURRENT, is_raw=False)
        weight = weights[i] if weights is not None else None
        weighted_pri = ScenarioWeightedPriority.objects.create(
            scenario=scenario, priority=condition, weight=weight)


@csrf_exempt
def create_scenario(request: HttpRequest) -> HttpResponse:
    try:
        # Check that the user is logged in.
        owner = get_user(request)

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
                "Cannot create scenario; plan is not owned by user")

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

        scenario = Scenario.objects.create(owner=owner, plan=plan)
        _set_scenario_metadata(priorities, weights, notes, scenario)
        scenario.save()
        return HttpResponse(str(scenario.pk))
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def _serialize_scenario(scenario: Scenario, weights: QuerySet) -> dict:
    result = ScenarioSerializer(scenario).data
    result['priorities'] = {}

    for weight in weights:
        serialized_weight = ScenarioWeightedPrioritySerializer(weight).data
        if 'priority' in serialized_weight and 'weight' in serialized_weight:
            result['priorities'][Condition.objects.get(
                pk=serialized_weight['priority']).condition_dataset.condition_name] = serialized_weight['weight']
    return result


@csrf_exempt
def get_scenario(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['id'], str)
        scenario_id = request.GET.get('id', "0")
        scenario = Scenario.objects.get(id=scenario_id)

        user = get_user(request)

        if scenario.owner != user:
            raise ValueError(
                "You do not have permission to view this scenario.")
        weights = ScenarioWeightedPriority.objects.select_related().filter(scenario=scenario)
        return JsonResponse(_serialize_scenario(scenario, weights), safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def list_scenarios_for_plan(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['plan_id'], str)
        plan_id = request.GET.get('plan_id', "0")
        plan_exists = Plan.objects.get(id=plan_id)

        user = get_user(request)

        if plan_exists.owner != user:
            raise ValueError(
                "You do not have permission to view scenarios for this plan.")

        scenarios = Scenario.objects.filter(owner=user, plan=plan_id)

        # TODO: return config details when behavior is agreed upon

        return JsonResponse([_serialize_scenario(scenario, weights=ScenarioWeightedPriority.objects.select_related().filter(
            scenario=scenario)) for scenario in scenarios], safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def get_scores(request: HttpRequest) -> HttpResponse:
    try:
        user = get_user(request)
        plan = get_plan_by_id(user, request.GET)

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
