import logging
import os

import numpy as np
import pandas as pd
from conditions.models import BaseCondition, Condition
from conditions.raster_utils import compute_condition_score_from_raster
from django.conf import settings
from django.contrib.gis.gdal import CoordTransform, SpatialReference
from django.contrib.gis.geos import GEOSGeometry
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse)
from forsys.get_forsys_inputs import (
    ForsysInputHeaders, ForsysProjectAreaRankingRequestParams)
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


def get_raster_geo(geo: GEOSGeometry) -> GEOSGeometry:
    if geo.srid == settings.CRS_FOR_RASTERS:
        return geo
    geo.transform(
        CoordTransform(
            SpatialReference(geo.srid),
            SpatialReference(settings.CRS_9822_PROJ4)))
    geo.srid = settings.CRS_FOR_RASTERS
    return geo


def get_forsys_input(
        params: ForsysProjectAreaRankingRequestParams,
        headers: ForsysInputHeaders) -> dict:
    region = params.region
    priorities = params.priorities
    project_areas = params.project_areas

    condition_ids_to_names = {
        c.pk: c.condition_name
        for c in BaseCondition.objects.filter(region_name=region).filter(
            condition_name__in=priorities).all()}
    if len(priorities) != len(condition_ids_to_names.keys()):
        raise Exception("of %d priorities, only %d had conditions" % (
            len(priorities), len(condition_ids_to_names.keys())))
    conditions = Condition.objects.filter(
        condition_dataset_id__in=condition_ids_to_names.keys()).filter(
        is_raw=False).all()
    if len(priorities) != len(conditions):
        raise Exception("of %d priorities, only %d had condition rasters" % (
            len(priorities), len(conditions)))

    data = {}
    data[headers.FORSYS_PROJECT_ID_HEADER] = []
    data[headers.FORSYS_STAND_ID_HEADER] = []
    data[headers.FORSYS_AREA_HEADER] = []
    data[headers.FORSYS_COST_HEADER] = []
    for p in priorities:
        data[headers.condition_header(p)] = []
        data[headers.priority_header(p)] = []

    for proj_id in project_areas.keys():
        geo = get_raster_geo(project_areas[proj_id])

        data[headers.FORSYS_PROJECT_ID_HEADER].append(proj_id)
        data[headers.FORSYS_STAND_ID_HEADER].append(proj_id)
        data[headers.FORSYS_AREA_HEADER].append(geo.area)
        data[headers.FORSYS_COST_HEADER].append(geo.area * 5000)
        for c in conditions:
            name = condition_ids_to_names[c.condition_dataset_id]
            score = compute_condition_score_from_raster(
                geo, c.raster_name)
            if score is None:
                raise Exception(
                    "no score was retrieved for condition, %s" % name)
            data[headers.condition_header(name)].append(score)
            data[headers.priority_header(name)].append(1.0 - score)
    return data


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

        forsys_input = get_forsys_input(params, headers)

        forsys_output = run_forsys_scenario_sets(
            forsys_input, headers.FORSYS_PROJECT_ID_HEADER,
            headers.FORSYS_STAND_ID_HEADER, headers.FORSYS_AREA_HEADER,
            headers.FORSYS_COST_HEADER, headers.priority_headers)

        response = {}
        response['forsys'] = {}
        response['forsys']['input'] = forsys_input
        response['forsys']['output_project'] = forsys_output.scenarios

        # TODO: configure response to potentially show stand coordinates and
        # other signals necessary for the UI.
        return HttpResponse(
            JsonResponse(response),
            content_type='application/json')

    except Exception as e:
        logger.error('scenario set error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
