import logging
import os

import numpy as np
import pandas as pd
from django.conf import settings
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse)
from forsys.get_forsys_inputs import (ForsysInputHeaders,
                                      ForsysProjectAreaRankingInput,
                                      ForsysProjectAreaRankingRequestParams)
from forsys.parse_forsys_output import ForsysScenarioSetOutput
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


# Runs a forsys scenario sets call.
def run_forsys_scenario_sets(
        forsys_input_dict: dict[str, list],
        forsys_proj_id_header: str, forsys_stand_id_header: str,
        forsys_area_header: str, forsys_cost_header: str,
        forsys_priority_headers: list[str],) -> ForsysScenarioSetOutput:
    import rpy2.robjects as robjects
    robjects.r.source(os.path.join(
        settings.BASE_DIR, 'forsys/scenario_sets.R'))
    scenario_sets_function_r = robjects.globalenv['scenario_sets']

    # TODO: add inputs for thresholds.
    # TODO: clean-up: pass header names (e.g. proj_id) into
    # scenario_sets_function_r.
    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    forsys_output = scenario_sets_function_r(forsys_input, robjects.StrVector(
        forsys_priority_headers),
        forsys_stand_id_header,
        forsys_proj_id_header,
        forsys_area_header,
        forsys_cost_header)

    parsed_output = ForsysScenarioSetOutput(
        forsys_output, forsys_priority_headers, forsys_proj_id_header,
        forsys_area_header, forsys_cost_header)

    # TODO: add logic for applying constraints to forsys_output.

    return parsed_output


# Returns JSon data for a forsys scenario set call.
def scenario_set(request: HttpRequest) -> HttpResponse:
    try:
        params = ForsysProjectAreaRankingRequestParams(request.GET)
        headers = ForsysInputHeaders(params.priorities)
        forsys_input = ForsysProjectAreaRankingInput(params, headers)
        forsys_output = run_forsys_scenario_sets(
            forsys_input.forsys_input, headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER, headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER, headers.priority_headers)

        response = {}
        response['forsys'] = {}
        response['forsys']['input'] = forsys_input.forsys_input
        response['forsys']['output_project'] = forsys_output.scenarios

        # TODO: configure response to potentially show stand coordinates and
        # other signals necessary for the UI.
        return JsonResponse(response)

    except Exception as e:
        logger.error('scenario set error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
