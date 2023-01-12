import json
import logging
import numpy as np
import os
import pandas as pd
import rpy2

from forsys.get_forsys_inputs import ForsysProjectAreaRankingRequestParams
from forsys.parse_forsys_output import ForsysScenarioSetOutput
from forsys.raster_merger import RasterMerger

from boundary.models import BoundaryDetails
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.conf import settings
from django.contrib.gis.gdal import CoordTransform, Envelope, GDALRaster, SpatialReference
from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.db.models.query import QuerySet
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse)

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


def get_boundary_debug_info(
        boundaries: QuerySet, project_area: MultiPolygon) -> dict:
    boundary_response = []
    for b in boundaries:
        geo = b.geometry
        p = project_area.clone()
        p.transform(CoordTransform(SpatialReference(
            project_area.srid), SpatialReference(geo.srid)))
        boundary_response.append(
            "%s (id=%s, intersection area=%f)" %
            (b.shape_name, b.boundary_id, geo.intersection(project_area).area))
    return boundary_response


def get_raster_debug_info(rasters: dict) -> dict:
    raster_response = []
    for c in rasters:
        r = rasters[c]
        d = r.bands[0].data()
        count = np.count_nonzero(~np.isnan(d))
        mean = np.sum(d[~np.isnan(d)]) / count if count > 0 else 0
        shape = np.shape(d)
        raster_response.append(
            "%s (non-nan area: %d, mean: %f, shape: %d x %d)" %
            (c, count, mean, shape[0],
             shape[1]))
    return raster_response


def get_condition_rasters(condition: str, region: str) -> QuerySet:
    conditions = BaseCondition.objects.filter(
        condition_name=condition).filter(region_name=region).all()
    if len(conditions) == 0:
        raise LookupError(
            "no condition with name, %s, exists in region, %s" %
            (condition, region))
    if len(conditions) > 1:
        raise LookupError(
            "more than 1 condition with name, %s, exists in region, %s" %
            (condition, region))
    c = conditions[0]
    condition_files = Condition.objects.filter(condition_dataset_id=c.id).all()
    if len(condition_files) == 0:
        raise LookupError(
            "no condition filename exists for condition id, %d" % (c.id))
    if len(condition_files) > 1:
        raise LookupError(
            "more than 1 condition filename exists for condition id, %d" %
            (c.id))

    condition_rasters = ConditionRaster.objects.filter(
        name=condition_files[0].raster_name)
    return condition_rasters


def raster_extent_overlaps_project_area(
        raster: GDALRaster, project_area: MultiPolygon) -> bool:
    e = raster.extent
    e_polygon = Polygon(((e[0], e[1]),
                         (e[2], e[1]),
                         (e[2], e[3]),
                         (e[0], e[3]),
                         (e[0], e[1])))
    return e_polygon.overlaps(project_area)

def fetch_condition_rasters(
        priorities: list[str],
        region: str, project_area: MultiPolygon) -> dict:
    all_rasters = {}

    for p in priorities:
        condition_rasters = get_condition_rasters(p, region)

        raster_merger = RasterMerger()

        for cr in condition_rasters:
            r = cr.raster

            # Checking for overlapping extents is faster than issuing a query
            # that checks for overlaps.
            if not raster_extent_overlaps_project_area(r, project_area):
                continue
            raster_merger.add_raster(r)

        all_rasters[p] = raster_merger.merged_raster

    return all_rasters


def convert_extent_to_raster_indices(extent: Envelope, origin: GDALRaster.origin, scale: GDALRaster.scale) -> Envelope:
    min_x = 0
    min_y = 0
    max_x = 0
    max_y = 0
    if scale[0] > 0:
        min_x = int(np.floor((extent[0] - origin[0]) / scale[0]))
        max_x = int(np.ceil((extent[2] - origin[0]) / scale[0]))
    else:
        min_x = int(np.floor((extent[2] - origin[0]) / scale[0]))
        max_x = int(np.ceil((extent[0] - origin[0]) / scale[0]))

    if scale[1] > 0:
        min_y = int(np.floor((extent[1] - origin[1]) / scale[1]))
        max_y = int(np.ceil((extent[3] - origin[1]) / scale[1]))
    else:
        min_y = int(np.floor((extent[3] - origin[1]) / scale[1]))
        max_y = int(np.ceil((extent[1] - origin[1]) / scale[1]))

    return (min_x, min_y, max_x, max_y)


def multipolygon_contains_point(
        origin: GDALRaster.origin, scale: GDALRaster.scale, x: int, y: int,
        multipolygon: MultiPolygon) -> bool:
    # TODO: adjust these equations for the case where skew != [0, 0]
    xpoly = origin[0] + x*scale[0]
    ypoly = origin[1] + y*scale[1]
    p = Point((xpoly, ypoly))
    return p.within(multipolygon)


def count_raster_data(data: np.ndarray, extent_indices: Envelope,
                      origin: GDALRaster.origin, scale: GDALRaster.scale,
                      multipolygon: MultiPolygon) -> [int, float]:
    count = 0
    sum = 0
    for y in range(extent_indices[1], extent_indices[3] + 1, 1):
        for x in range(extent_indices[0], extent_indices[2] + 1, 1):
            d = data[y][x]
            if np.isnan(d):
                continue
            if not multipolygon_contains_point(
                    origin, scale, x, y, multipolygon):
                continue
            sum = sum + d
            count = count + 1
    return count, sum


def get_condition_data(raster: GDALRaster, multipolygon: MultiPolygon) -> dict:
    scale = raster.scale
    origin = raster.origin

    multipolygon_extent_indices = convert_extent_to_raster_indices(
        multipolygon.extent, origin, scale)

    data = raster.bands[0].data()

    count, sum = count_raster_data(
        data, multipolygon_extent_indices, origin, scale, multipolygon)

    if count == 0:
        return {"mean": 0, "count": 0}
    return {"mean": sum / count, "count": count}


def transform_into_forsys_df_data(condition_rasters: QuerySet,
                                  boundaries: QuerySet,
                                  project_area: MultiPolygon,
                                  project_area_id: int) -> dict[str, list]:
    kConditionPrefix = "cond"
    kPriorityPrefix = "p"
    # TODO: fix cost estimation once rasters become available.
    kUnitAreaCost = 5000

    data = {}
    data['proj_id'] = []
    data['stand_id'] = []
    data['shape_name'] = []
    for c in condition_rasters.keys():
        data[kConditionPrefix + "_" + c] = []
        data[kPriorityPrefix + "_" + c] = []
        data['area'] = []
        data['cost'] = []

    for b in boundaries:
        geo = b.geometry.clone()
        geo.transform(CoordTransform(SpatialReference(geo.srid),
                      SpatialReference(settings.CRS_9822_PROJ4)))
        geo = project_area.intersection(geo)

        # TODO: set project_area ID from an external source
        data['proj_id'].append(project_area_id)
        # TODO: double-check that it makes sense to use this ID.
        data['stand_id'].append(b.id)
        # TODO: double-check that this field is necessary.
        data['shape_name'].append(b.shape_name)
        data['area'].append(geo.area)
        # TODO: adjust cost as a function of treatment type.
        data['cost'].append(kUnitAreaCost * geo.area)

        for c in condition_rasters.keys():
            d = get_condition_data(condition_rasters[c], geo)
            data[kConditionPrefix + "_" + c].append(d['mean'])
            # TODO: adjust improvement score as a function of treatment type.
            data[kPriorityPrefix + "_" +
                 c].append((1.0 - d['mean']) * d['count'])

    return data


# Runs a forsys scenario sets call.
def run_forsys_scenario_sets(
        forsys_input_dict: dict[str, list],
        priorities: list[str]) -> ForsysScenarioSetOutput:
    kPriorityPrefix = "p"

    import rpy2.robjects as robjects
    robjects.r.source(os.path.join(
        settings.BASE_DIR, 'forsys/scenario_sets.R'))
    scenario_sets_function_r = robjects.globalenv['scenario_sets']

    # TODO: add inputs for thresholds.
    # TODO: clean-up: pass header names (e.g. proj_id) into
    # scenario_sets_function_r.
    forsys_input = convert_dictionary_of_lists_to_rdf(forsys_input_dict)

    priority_headers = []
    for p in priorities:
        priority_headers.append(kPriorityPrefix + "_" + p)

    forsys_output = scenario_sets_function_r(
        forsys_input, robjects.StrVector(priority_headers))

    parsed_output = ForsysScenarioSetOutput(
        forsys_output, priority_headers, 'proj_id', 'area', 'cost')

    # TODO: add logic for applying constraints to forsys_output.

    return parsed_output


# Returns JSon data for a forsys scenario set call.
def scenario_set(request: HttpRequest) -> HttpResponse:
    try:
        params = ForsysProjectAreaRankingRequestParams(request.GET)
        save_debug_info = params.save_debug_info
        region = params.region
        priorities = params.priorities
        project_areas = params.project_areas

        # TODO: remove this because it's likely not be neceessary if we're ranking project areas rather than stands.
        huc12_id = 43

        forsys_input_df = {}
        for id in project_areas.keys():
            project_area = project_areas[id]
            project_area_raster = project_area.clone()
            project_area_raster.transform(CoordTransform(SpatialReference(
                project_area.srid), SpatialReference(settings.CRS_9822_PROJ4)))

            response = {}
            if (save_debug_info):
                response['debug'] = {}

            # Filters boundaries by boundary_id.
            # TODO: add more stand options. For the existing solution, project
            # areas drawn manually are divided into stands according to HUC-12
            # boundaries.
            # TODO: double-check, in this case, that "__intersects" works when
            # project_area and boundary geometry have different srid's.
            boundaries = BoundaryDetails.objects.filter(
                boundary_id=huc12_id).filter(
                geometry__intersects=project_area)
            if (save_debug_info):
                response['debug']['huc-12 boundaries'] = get_boundary_debug_info(
                    boundaries, project_area)

            # Fetches priority rasters for the given project area.
            condition_rasters = fetch_condition_rasters(
                priorities, region, project_area_raster)
            if (save_debug_info):
                response['debug']['rasters'] = get_raster_debug_info(
                    condition_rasters)

            # Transforms rasters into dataframes.
            # TODO: instead of using HUC-12 boundaries to delineate stands, add
            # options for using individual pixels and individual latitudinal
            # bars.
            dataframe_data = transform_into_forsys_df_data(
                condition_rasters, boundaries, project_area_raster, id)

            if len(forsys_input_df.keys()) == 0:
                forsys_input_df = dataframe_data
            else:
                for k in forsys_input_df.keys():
                    for v in dataframe_data[k]:
                        forsys_input_df[k].append(v)

        dataframe = pd.DataFrame(data=forsys_input_df)
        response['forsys'] = {}
        response['forsys']['input_df'] = dataframe.to_json()

        forsys_scenario_sets_output = run_forsys_scenario_sets(
            forsys_input_df, priorities)

        response['forsys']['output_project'] = json.dumps(
            forsys_scenario_sets_output.scenarios)

        # TODO: configure response to potentially show stand coordinates and
        # other signals necessary for the UI.

        return HttpResponse(
            JsonResponse(response),
            content_type='application/json')

    except Exception as e:
        logger.error('scenario set error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
