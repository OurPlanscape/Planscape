from base.condition_types import ConditionScoreType
from conditions.models import Condition
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from forsys.forsys_request_params import ForsysGenerationRequestParams
from forsys.parse_forsys_output import ForsysGenerationOutputForASingleScenario
from plan.models import (
    Plan, Project, ProjectArea, RankedProjectArea, Scenario,
    ScenarioWeightedPriority)


def create_plan_and_scenario(
        params: ForsysGenerationRequestParams) -> Scenario:
    user = params.db_params.user

    plan = Plan.objects.create(
        owner=user, name="my new plan", region_name=params.region,
        geometry=params.planning_area)
    plan.save()

    project = Project.objects.create(owner=user, plan=plan)
    project.save()

    scenario = Scenario.objects.create(
        owner=user, plan=plan, project=project,
        status=Scenario.ScenarioStatus.SUCCESS)
    scenario.save()

    for i in range(len(params.priorities)):
        condition = Condition.objects.select_related('condition_dataset').get(
            condition_dataset__condition_name=params.priorities[i],
            condition_score_type=ConditionScoreType.CURRENT, is_raw=False)
        weighted_priority = ScenarioWeightedPriority.objects.create(
            scenario=scenario, priority=condition, weight=params.priority_weights[i])
        weighted_priority.save()

    return scenario


def _get_multipolygon(wkt: str):
    geo = GEOSGeometry(wkt)
    if geo.geom_typeid == 6:
        return geo
    elif geo.geom_typeid == 3:
        return MultiPolygon((geo))
    
    raise Exception(
        "geometry, %s, is neither a polygon nor a multipolylgon" % (wkt))


def write_to_db(scenario: Scenario,
                output_scenario: dict):
    owner = scenario.owner
    project = scenario.project
    for p in output_scenario['ranked_projects']:
        project_area = ProjectArea.objects.create(
            owner=owner, project=project,
            project_area=_get_multipolygon(p['geo_wkt']))
        project_area.save()
        ranked_project_area = RankedProjectArea.objects.create(
            scenario=scenario, project_area=project_area,
            rank=p['rank'], weighted_score=p['total_score'])
        ranked_project_area.save()
