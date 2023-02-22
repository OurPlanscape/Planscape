import logging
import os

import numpy as np
import pandas as pd
from django.conf import settings
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse)
from forsys.forsys_request_params import (ForsysGenerationRequestParams,
                                          ForsysRankingRequestParams)
from forsys.get_forsys_inputs import (ForsysGenerationInput,
                                      ForsysInputHeaders, ForsysRankingInput)
from forsys.parse_forsys_output import (
    ForsysGenerationOutputForASingleScenario,
    ForsysRankingOutputForASingleScenario,
    ForsysRankingOutputForMultipleScenarios)
from planscape import settings

import rpy2

# Configures global logging.
logger = logging.getLogger(__name__)


# Converts R dataframe to Pandas dataframe.
# TODO: the broadly-accepted solution involves robjects.conversion.rpy2py -
#   debug why it failed with an input type error.
def convert_rdf_to_pddf(rdf: dict) -> "pd.Dataframe":
    pddf = pd.DataFrame.from_dict(
        {key: np.asarray(rdf.rx2(key)) for key in rdf.names})
    return pddf


# Converts dictionary of lists to R dataframe.
# The lists must have equal length.
def convert_dictionary_of_lists_to_rdf(
        lists: dict) -> "rpy2.robjects.vectors.DataFrame":
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


def run_forsys_rank_project_areas_for_multiple_scenarios(
        forsys_input_dict: dict[str, list],
        max_area_in_km2: float | None, max_cost_in_usd: float | None,
        forsys_proj_id_header: str, forsys_stand_id_header: str,
        forsys_area_header: str, forsys_cost_header: str,
        forsys_priority_headers: list[str]) -> ForsysRankingOutputForMultipleScenarios:
    import rpy2.robjects as robjects
    robjects.r.source(os.path.join(
        settings.BASE_DIR, 'forsys/rank_projects_for_multiple_scenarios.R'))
    rank_projects_for_multiple_scenarios_function_r = robjects.globalenv[
        'rank_projects_for_multiple_scenarios']

    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = rank_projects_for_multiple_scenarios_function_r(
        forsys_input, robjects.StrVector(forsys_priority_headers),
        forsys_stand_id_header, forsys_proj_id_header, forsys_area_header,
        forsys_cost_header)

    parsed_output = ForsysRankingOutputForMultipleScenarios(
        forsys_output, forsys_priority_headers, max_area_in_km2, max_cost_in_usd,
        forsys_proj_id_header, forsys_area_header, forsys_cost_header)

    return parsed_output


# Returns JSon data for a forsys scenario set call.
def rank_project_areas_for_multiple_scenarios(
        request: HttpRequest) -> HttpResponse:
    try:
        params = ForsysRankingRequestParams(request.GET)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysRankingInput(params, headers)
        forsys_output = run_forsys_rank_project_areas_for_multiple_scenarios(
            forsys_input.forsys_input, params.max_area_in_km2, params.max_cost_in_usd, headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER, headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER, headers.priority_headers)

        response = {}
        response['forsys'] = {}
        response['forsys']['input'] = forsys_input.forsys_input
        response['forsys']['output_scenarios'] = forsys_output.scenarios

        return JsonResponse(response)

    except Exception as e:
        logger.error('project area ranking error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def run_forsys_rank_project_areas_for_a_single_scenario(
        forsys_input_dict: dict[str, list],
        max_area_in_km2: float | None, max_cost_in_usd: float | None,
        forsys_proj_id_header: str, forsys_stand_id_header: str,
        forsys_area_header: str, forsys_cost_header: str,
        forsys_priority_headers: list[str],
        forsys_priority_weights: list[float]) -> ForsysRankingOutputForASingleScenario:
    import rpy2.robjects as robjects
    robjects.r.source(os.path.join(
        settings.BASE_DIR, 'forsys/rank_projects_for_a_single_scenario.R'))
    rank_projects_for_a_single_scenario_function_r = robjects.globalenv[
        'rank_projects_for_a_single_scenario']

    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = rank_projects_for_a_single_scenario_function_r(
        forsys_input, robjects.StrVector(forsys_priority_headers),
        robjects.FloatVector(forsys_priority_weights),
        forsys_stand_id_header, forsys_proj_id_header, forsys_area_header,
        forsys_cost_header)

    priority_weights_dict = {
        forsys_priority_headers[i]: forsys_priority_weights[i]
        for i in range(len(forsys_priority_headers))}
    parsed_output = ForsysRankingOutputForASingleScenario(
        forsys_output, priority_weights_dict, max_area_in_km2, max_cost_in_usd,
        forsys_proj_id_header, forsys_area_header, forsys_cost_header)

    return parsed_output


def rank_project_areas_for_a_single_scenario(
        request: HttpRequest) -> HttpResponse:
    try:
        params = ForsysRankingRequestParams(request.GET)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysRankingInput(params, headers)
        forsys_output = run_forsys_rank_project_areas_for_a_single_scenario(
            forsys_input.forsys_input, params.max_area_in_km2,
            params.max_cost_in_usd, headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER, headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER, headers.priority_headers,
            params.priority_weights)

        response = {}
        response['forsys'] = {}
        response['forsys']['input'] = forsys_input.forsys_input
        response['forsys']['output_scenario'] = forsys_output.scenario

        return JsonResponse(response)

    except Exception as e:
        logger.error('project area ranking error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def run_forsys_generate_project_areas_for_a_single_scenario(
        forsys_input_dict: dict[str, list],
        forsys_proj_id_header: str, forsys_stand_id_header: str,
        forsys_area_header: str, forsys_cost_header: str,
        forsys_geo_wkt_header: str, forsys_priority_headers: list[str],
        forsys_priority_weights: list[float]) -> ForsysGenerationOutputForASingleScenario:
    import rpy2.robjects as robjects
    robjects.r.source(os.path.join(
        settings.BASE_DIR, 'forsys/generate_projects_for_a_single_scenario.R'))
    generate_projects_for_a_single_scenario_function_r = robjects.globalenv[
        'generate_projects_for_a_single_scenario']

    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = generate_projects_for_a_single_scenario_function_r(
        forsys_input, robjects.StrVector(forsys_priority_headers),
        robjects.FloatVector(forsys_priority_weights),
        forsys_stand_id_header, forsys_proj_id_header, forsys_area_header,
        forsys_cost_header, forsys_geo_wkt_header)

    priority_weights_dict = {
        forsys_priority_headers[i]: forsys_priority_weights[i]
        for i in range(len(forsys_priority_headers))}
    parsed_output = ForsysGenerationOutputForASingleScenario(
        forsys_output, priority_weights_dict,
        forsys_proj_id_header, forsys_area_header, forsys_cost_header)
    return parsed_output


def generate_project_areas_for_a_single_scenario(
        request: HttpRequest) -> HttpResponse:
    try:
        params = ForsysGenerationRequestParams(request)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysGenerationInput(params, headers)
        forsys_output = run_forsys_generate_project_areas_for_a_single_scenario(
            forsys_input.forsys_input, headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER, headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER, headers.FORSYS_GEO_WKT_HEADER,
            headers.priority_headers, params.priority_weights)

        response = {}
        response['forsys'] = {}
        response['forsys']['input'] = forsys_input.forsys_input
        response['forsys']['output'] = forsys_output.scenario

        # TODO: add logic for parsing forsys output.

        return JsonResponse(response)
    except Exception as e:
        logger.error('project area generation error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
