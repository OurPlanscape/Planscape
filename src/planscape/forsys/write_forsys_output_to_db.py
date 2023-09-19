from datetime import datetime

from base.condition_types import ConditionScoreType
from conditions.models import Condition
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from forsys.forsys_request_params import ForsysGenerationRequestParams
from plan.models import (
    Plan,
    Project,
    ProjectArea,
    RankedProjectArea,
    Scenario,
    ScenarioWeightedPriority,
)
from pytz import timezone


# Given a WKT, validates that the WKT repreesents either a Polygon or
# MultiPolygon, then returns a MultiPolygon.
def _get_multipolygon(wkt: str):
    geo = GEOSGeometry(wkt)
    if geo.geom_typeid == 6:
        return geo
    elif geo.geom_typeid == 3:
        multi = MultiPolygon((geo))
        multi.srid = geo.srid
        return multi

    raise Exception("geometry, %s, is neither a polygon nor a multipolygon" % (wkt))


def _create_plan(params: ForsysGenerationRequestParams) -> Plan:
    plan = Plan.objects.create(
        owner=params.db_params.user,
        name=datetime.now()
        .astimezone(timezone("US/Pacific"))
        .strftime("%Y%-m-%d-%H:%M"),
        region_name=params.region,
        geometry=_get_multipolygon(params.planning_area),
    )
    plan.save()
    return plan


def _create_weighted_priorities(
    params: ForsysGenerationRequestParams, scenario: Scenario
):
    for i in range(len(params.priorities)):
        condition = Condition.objects.select_related("condition_dataset").get(
            condition_dataset__condition_name=params.priorities[i],
            condition_score_type=ConditionScoreType.CURRENT,
            is_raw=False,
        )
        weighted_priority = ScenarioWeightedPriority.objects.create(
            scenario=scenario, priority=condition, weight=params.priority_weights[i]
        )
        weighted_priority.save()


# Creates a plan, project, scenario, and the weighted priorities associated
# with a scenario.
# This is primarily used for debug purposes, when
# ForsysGenerationRequestParams.db_params is missing a scenario.
# TODO: this assumes ForsysGenerationRequestParams is well-formed; input
# validation logic needs to be added and tested.
def create_plan_and_scenario(params: ForsysGenerationRequestParams) -> Scenario:
    user = params.db_params.user

    plan = _create_plan(params)

    project = Project.objects.create(owner=user, plan=plan)
    project.save()

    scenario = Scenario.objects.create(owner=user, plan=plan, project=project)
    scenario.save()

    _create_weighted_priorities(params, scenario)

    return scenario


# Given a Scenario and Forsys output data, adds ProjectArea and
# RankedProjectArea objects to the DB.
# Forsys output data, represented by output_scenario, is the dictionary in
# ForsysGenerationOutputForASingleScenario.scenario.
# TODO: this assumes the input arguments are well-formed; input validation
# logic needs to be added and tested.
def save_generation_output_to_db(scenario: Scenario, output_scenario: dict):
    owner = scenario.owner
    project = scenario.project

    for p in output_scenario["ranked_projects"]:
        # TODO: add scenario as an optional field in ProjectArea so that project areas previously-generated for a scenario can be deleted.
        project_area = ProjectArea.objects.create(
            owner=owner, project=project, project_area=_get_multipolygon(p["geo_wkt"])
        )
        project_area.save()

        ranked_project_area = RankedProjectArea.objects.create(
            scenario=scenario,
            project_area=project_area,
            rank=p["rank"],
            weighted_score=p["total_score"],
        )
        ranked_project_area.save()

    scenario.status = Scenario.ScenarioStatus.SUCCESS
    scenario.save()


# TODO: add save_ranking_output_to_db.
