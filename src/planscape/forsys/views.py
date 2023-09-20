import cProfile
import io
import json
import logging
import os
import pstats
from datetime import datetime
from pstats import SortKey

import numpy as np
import pandas as pd
import rpy2
from base.condition_types import ConditionScoreType
from django.conf import settings
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseBadRequest,
    JsonResponse,
    QueryDict,
)
from django.views.decorators.csrf import csrf_exempt
from forsys.forsys_request_params import (
    ClusterAlgorithmType,
    get_generation_request_params,
    get_ranking_request_params,
)
from forsys.get_forsys_inputs import (
    ForsysGenerationInput,
    ForsysInputHeaders,
    ForsysRankingInput,
)
from forsys.parse_forsys_output import (
    ForsysGenerationOutputForASingleScenario,
    ForsysRankingOutputForASingleScenario,
    ForsysRankingOutputForMultipleScenarios,
)
from forsys.write_forsys_output_to_db import (
    create_plan_and_scenario,
    save_generation_output_to_db,
)
from memory_profiler import profile
from plan.models import Condition, Scenario, ScenarioWeightedPriority
from planscape import settings
from pytz import timezone

# Configures global logging.
logger = logging.getLogger(__name__)


# Sets up cProfile profiler.
# This is for measuring runtime.
def _set_up_cprofiler(pr: cProfile.Profile) -> None:
    pr.enable()


# Tears down Cprofile profiler and writes data to a log.
# This is for measuring runtime.
def _tear_down_cprofiler(pr: cProfile.Profile, filename: str) -> None:
    pr.disable()
    s = io.StringIO()
    sortby = SortKey.CUMULATIVE
    ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
    ps.print_stats()
    s.getvalue()
    cfp = open(filename, "w+")
    cfp.write(s.getvalue())


# Converts R dataframe to Pandas dataframe.
# TODO: the broadly-accepted solution involves robjects.conversion.rpy2py -
#   debug why it failed with an input type error.
def convert_rdf_to_pddf(rdf: dict) -> "pd.Dataframe":
    pddf = pd.DataFrame.from_dict({key: np.asarray(rdf.rx2(key)) for key in rdf.names})
    return pddf


# Converts dictionary of lists to R dataframe.
# The lists must have equal length.
def convert_dictionary_of_lists_to_rdf(
    lists: dict,
) -> "rpy2.robjects.vectors.DataFrame":
    data = {}
    for key in lists.keys():
        if len(lists[key]) == 0:
            continue
        el = lists[key][0]
        if isinstance(el, str):
            data[key] = rpy2.robjects.StrVector(lists[key])
        elif isinstance(el, float):
            data[key] = rpy2.robjects.FloatVector(lists[key])
        elif isinstance(el, int):
            data[key] = rpy2.robjects.IntVector(lists[key])

    rdf = rpy2.robjects.vectors.DataFrame(data)
    return rdf


def convert_r_listvector_to_python_dict(
    raw_forsys_output: "rpy2.robjects.vectors.ListVector",
) -> dict:
    stand_output_rdf = raw_forsys_output[0]
    project_output_rdf = raw_forsys_output[1]
    forsys_project_output_df: dict[str, list] = {
        key: (np.asarray(project_output_rdf.rx2(key)).tolist())
        for key in project_output_rdf.names
    }
    forsys_stand_output_df: dict[str, list] = {
        key: (np.asarray(stand_output_rdf.rx2(key)).tolist())
        for key in stand_output_rdf.names
    }

    return {"stand": forsys_stand_output_df, "project": forsys_project_output_df}


def run_forsys_rank_project_areas_for_multiple_scenarios(
    forsys_input_dict: dict[str, list],
    max_area_in_km2: float | None,
    max_cost_in_usd: float | None,
    forsys_proj_id_header: str,
    forsys_stand_id_header: str,
    forsys_area_header: str,
    forsys_cost_header: str,
    forsys_priority_headers: list[str],
) -> ForsysRankingOutputForMultipleScenarios:
    import rpy2.robjects as robjects

    robjects.r.source(
        os.path.join(settings.BASE_DIR, "forsys/rank_projects_for_multiple_scenarios.R")
    )
    rank_projects_for_multiple_scenarios_function_r = robjects.globalenv[
        "rank_projects_for_multiple_scenarios"
    ]

    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = rank_projects_for_multiple_scenarios_function_r(
        forsys_input,
        robjects.StrVector(forsys_priority_headers),
        forsys_stand_id_header,
        forsys_proj_id_header,
        forsys_area_header,
        forsys_cost_header,
    )

    parsed_output = ForsysRankingOutputForMultipleScenarios(
        convert_r_listvector_to_python_dict(forsys_output),
        forsys_priority_headers,
        max_area_in_km2,
        max_cost_in_usd,
        forsys_proj_id_header,
        forsys_area_header,
        forsys_cost_header,
    )

    return parsed_output


# Returns JSon data for a forsys scenario set call.
def rank_project_areas_for_multiple_scenarios(request: HttpRequest) -> HttpResponse:
    try:
        params = get_ranking_request_params(request.GET)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysRankingInput(params, headers)
        forsys_output = run_forsys_rank_project_areas_for_multiple_scenarios(
            forsys_input.forsys_input,
            params.max_area_in_km2,
            params.max_cost_in_usd,
            headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER,
            headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER,
            headers.priority_headers,
        )

        response = {}
        response["forsys"] = {}
        response["forsys"]["input"] = forsys_input.forsys_input
        response["forsys"]["output_scenarios"] = forsys_output.scenarios

        return JsonResponse(response)

    except Exception as e:
        logger.error("project area ranking error: " + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def run_forsys_rank_project_areas_for_a_single_scenario(
    forsys_input_dict: dict[str, list],
    max_area_in_km2: float | None,
    max_cost_in_usd: float | None,
    forsys_proj_id_header: str,
    forsys_stand_id_header: str,
    forsys_area_header: str,
    forsys_cost_header: str,
    forsys_priority_headers: list[str],
    forsys_priority_weights: list[float],
) -> ForsysRankingOutputForASingleScenario:
    import rpy2.robjects as robjects

    robjects.r.source(
        os.path.join(settings.BASE_DIR, "forsys/rank_projects_for_a_single_scenario.R")
    )
    rank_projects_for_a_single_scenario_function_r = robjects.globalenv[
        "rank_projects_for_a_single_scenario"
    ]

    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = rank_projects_for_a_single_scenario_function_r(
        forsys_input,
        robjects.StrVector(forsys_priority_headers),
        robjects.FloatVector(forsys_priority_weights),
        forsys_stand_id_header,
        forsys_proj_id_header,
        forsys_area_header,
        forsys_cost_header,
    )

    priority_weights_dict = {
        forsys_priority_headers[i]: forsys_priority_weights[i]
        for i in range(len(forsys_priority_headers))
    }
    parsed_output = ForsysRankingOutputForASingleScenario(
        forsys_output,
        priority_weights_dict,
        max_area_in_km2,
        max_cost_in_usd,
        forsys_proj_id_header,
        forsys_area_header,
        forsys_cost_header,
    )

    return parsed_output


def rank_project_areas_for_a_single_scenario(request: HttpRequest) -> HttpResponse:
    try:
        params = get_ranking_request_params(request.GET)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysRankingInput(params, headers)
        forsys_output = run_forsys_rank_project_areas_for_a_single_scenario(
            forsys_input.forsys_input,
            params.max_area_in_km2,
            params.max_cost_in_usd,
            headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER,
            headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER,
            headers.priority_headers,
            params.priority_weights,
        )

        response = {}
        response["forsys"] = {}
        response["forsys"]["input"] = forsys_input.forsys_input
        response["forsys"]["output_scenario"] = forsys_output.scenario

        return JsonResponse(response)

    except Exception as e:
        logger.error("project area ranking error: " + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def run_forsys_generate_project_areas_for_a_single_scenario(
    forsys_input_dict: dict[str, list],
    headers: ForsysInputHeaders,
    forsys_priority_weights: list[float],
    enable_kmeans_clustering: bool,
    output_scenario_name: str | None,
    output_scenario_tag: str | None,
    max_cost_per_project_in_usd: float | None,
    max_area_per_project_in_km2: float | None,
) -> ForsysGenerationOutputForASingleScenario:
    import rpy2.robjects as robjects

    robjects.r.source(
        os.path.join(
            settings.BASE_DIR, "forsys/generate_projects_for_a_single_scenario.R"
        )
    )
    generate_projects_for_a_single_scenario_function_r = robjects.globalenv[
        "generate_projects_for_a_single_scenario"
    ]

    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = generate_projects_for_a_single_scenario_function_r(
        forsys_input,
        robjects.StrVector(headers.priority_headers),
        robjects.StrVector(headers.condition_headers),
        robjects.FloatVector(forsys_priority_weights),
        headers.FORSYS_STAND_ID_HEADER,
        headers.FORSYS_PROJECT_ID_HEADER,
        headers.FORSYS_AREA_HEADER,
        headers.FORSYS_COST_HEADER,
        headers.FORSYS_GEO_WKT_HEADER,
        headers.FORSYS_TREATMENT_ELIGIBILITY_HEADER,
        "" if output_scenario_name is None else output_scenario_name,
        "" if output_scenario_tag is None else output_scenario_tag,
        enable_kmeans_clustering,
        "" if max_cost_per_project_in_usd is None else max_cost_per_project_in_usd,
        max_area_per_project_in_km2,
    )

    priority_weights_dict = {
        headers.priority_headers[i]: forsys_priority_weights[i]
        for i in range(len(headers.priority_headers))
    }
    parsed_output = ForsysGenerationOutputForASingleScenario(
        convert_r_listvector_to_python_dict(forsys_output),
        priority_weights_dict,
        headers.FORSYS_PROJECT_ID_HEADER,
        headers.FORSYS_AREA_HEADER,
        headers.FORSYS_COST_HEADER,
        headers.FORSYS_GEO_WKT_HEADER,
    )
    return parsed_output


def generate_project_areas_for_a_single_scenario(request: HttpRequest) -> HttpResponse:
    try:
        pr = cProfile.Profile()
        if settings.DEBUG:
            _set_up_cprofiler(pr)

        params = get_generation_request_params(request)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysGenerationInput(params, headers)
        forsys_output = run_forsys_generate_project_areas_for_a_single_scenario(
            forsys_input.forsys_input,
            headers,
            params.priority_weights,
            params.cluster_params.cluster_algorithm_type
            == ClusterAlgorithmType.KMEANS_IN_R,
            "test_scenario" if settings.DEBUG else None,
            datetime.now().astimezone(timezone("US/Pacific")).strftime("%Y%m%d-%H-%M")
            if settings.DEBUG
            else None,
            params.max_cost_per_project_in_usd,
            params.max_area_per_project_in_km2,
        )

        response = {}
        response["forsys"] = {}
        response["forsys"]["input"] = forsys_input.forsys_input
        response["forsys"]["output"] = forsys_output.scenario

        if params.db_params.write_to_db:
            scenario = (
                create_plan_and_scenario(params)
                if params.db_params.scenario is None
                else params.db_params.scenario
            )
            save_generation_output_to_db(scenario, forsys_output.scenario)
            response["db"] = {}
            response["db"]["scenario_id"] = str(scenario.pk)
            response["db"]["project_id"] = str(scenario.project.pk)
            response["db"]["plan_id"] = str(scenario.plan.pk)

        if settings.DEBUG:
            _tear_down_cprofiler(pr, "output/cprofiler.log")

        return JsonResponse(response)
    except Exception as e:
        logger.error("project area generation error: " + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@csrf_exempt
def generate_project_areas_from_lambda_output_prototype(
    request: HttpRequest,
) -> HttpResponse:
    try:
        body = json.loads(request.body)
        if not "stand" in body or not "project" in body:
            raise ValueError("Either the forsys stand or project dictionary is missing")
        forsys_output_json = {"stand": body["stand"], "project": body["project"]}

        scenario_id = body.get("scenario_id", None)
        if not (isinstance(scenario_id, int)):
            raise ValueError("Must specify scenario_id as an integer")
        scenario = Scenario.objects.get(id=scenario_id)

        temp_request = HttpRequest()
        temp_request.GET = QueryDict(
            "request_type=0"
            + "&debug_user_id="
            + str(scenario.owner.pk)
            + "&scenario_id="
            + str(scenario_id)
        )
        params = get_generation_request_params(
            temp_request
        )  # returns ForsysGenerationRequestParamsFromDb
        headers = ForsysInputHeaders(params.priorities)

        priority_weights_dict = {
            headers.priority_headers[i]: params.priority_weights[i]
            for i in range(len(headers.priority_headers))
        }

        parsed_output = ForsysGenerationOutputForASingleScenario(
            forsys_output_json,
            priority_weights_dict,
            headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER,
            headers.FORSYS_GEO_WKT_HEADER,
        )

        save_generation_output_to_db(params.db_params.scenario, parsed_output.scenario)

        return JsonResponse(parsed_output.scenario, safe=False)
    except Exception as e:
        logger.error("project area generation error: " + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


# This enables memory profiling of generate_project_areas_for_a_single_scenario
# if settings.DEBUG is true.
# memory profile data is written to output/memprofiler.log.
# To bring up the Planscape backend with memory profiler, call:
# mprof run --multiprocess --python python manage.py runserver --noreload
# To view memory usage over time, call:
# mprof plot
if settings.DEBUG:
    if not os.path.exists("output"):
        os.makedirs("output")
    memfp = open("output/memprofiler.log", "w+")
    generate_project_areas_for_a_single_scenario = profile(stream=memfp)(
        generate_project_areas_for_a_single_scenario
    )
