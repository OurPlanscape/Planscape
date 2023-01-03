import logging
import numpy as np
import os
import pandas as pd
import rpy2
import sys

from boundary.models import BoundaryDetails
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.conf import settings
from django.contrib.gis.gdal import CoordTransform, SpatialReference, GDALRaster
from django.contrib.gis.geos import GEOSGeometry, Point, Polygon
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)


# Configure global logging.
logger = logging.getLogger(__name__)

# Converts R dataframe to Pandas dataframe.
# TODO: the broadly-accepted solution involves robjects.conversion.rpy2py - debug why it failed with an input type error.
def convert_rdf_to_pddf(rdf):
  pddf = pd.DataFrame.from_dict({ key : np.asarray(rdf.rx2(key)) for key in rdf.names })
  return pddf

# Converts dictionary of lists to R dataframe.
# The lists must have equal length.
def convert_dictionary_of_lists_to_rdf(lists):
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

# Translates polygon.
def translate_polygon(polygon, dx, dy):
  coords = []
  for ring in polygon.coords:
    for point in ring:
      coords.append((point[0] + dx, point[1] + dy))
  translated = Polygon( tuple(coords) ) 
  translated.srid = polygon.srid
  return translated

def get_boundary_debug_info(boundaries, project_area):
  boundary_response = []
  for b in boundaries:
    boundary_response.append("%s (id=%s, intersection area=%f)"%(b.shape_name, b.boundary_id, b.geometry.intersection(project_area).area))
  return boundary_response

def get_raster_debug_info(rasters):
  raster_response = []
  for c in rasters:
    r = rasters[c]
    d = r.bands[0].data()
    count = np.count_nonzero(~np.isnan(d))
    mean = np.sum(d[~np.isnan(d)]) / count
    shape = np.shape(d)
    raster_response.append("%s (non-nan area: %d, mean: %f, shape: %d x %d)"%(c, count, mean, shape[0], shape[1]))
  return raster_response

def get_condition_rasters(condition, region):
  conditions = BaseCondition.objects.filter(condition_name=condition).filter(region_name=region).all()
  if len(conditions) == 0:
    raise LookupError("no condition with name, %s, exists in region, %s"%(condition, region))
  if len(conditions) > 1:
    raise LookupError("more than 1 condition with name, %s, exists in region, %s"%(condition, region))
  c = conditions[0]
  condition_files = Condition.objects.filter(condition_dataset_id=c.id).all()
  if len(condition_files) == 0:
    raise LookupError("no condition filename exists for condition id, %d"%(c.id))
  if len(condition_files) > 1:
    raise LookupError("more than 1 condition filename exists for condition id, %d"%(c.id))

  condition_rasters = ConditionRaster.objects.filter(name=condition_files[0].raster_name)
  return condition_rasters

def raster_extent_overlaps_project_area(raster, project_area):
  e = raster.extent
  e_polygon = Polygon( ((e[0], e[1]),
                        (e[2], e[1]),
                        (e[2], e[3]),
                        (e[0], e[3]),
                        (e[0], e[1])) )
  return e_polygon.overlaps(project_area)

# Merges two raster inputs into a single output raster according to the scale and skew of the base_raster.
def mosaic_rasters(base_raster, addon_raster):
  scale = base_raster.scale
  skew = base_raster.skew
  origin = base_raster.origin

  # distorts the add-on raster according to the scale and skew of the base raster.
  addon_raster_copy = addon_raster.warp({"scale": scale, "skew": skew})

  # computes the origin, width, and height of the merged raster and adjusts rasters accordingly.
  origin[0] = addon_raster_copy.origin[0] if addon_raster_copy.origin[0] < origin[0] else origin[0]
  origin[1] = addon_raster_copy.origin[1] if addon_raster_copy.origin[1] > origin[1] else origin[1]

  width = int(np.ceil(addon_raster_copy.width + (addon_raster_copy.origin[0] - origin[0]) / scale[0]))
  height = int(np.ceil(addon_raster_copy.height + (addon_raster_copy.origin[1] - origin[1]) / scale[1]))

  addon_raster_copy = addon_raster_copy.warp({"width": width, "height": height, "origin": origin})
  base_raster_copy = base_raster.warp({"width": width, "height": height, "origin": origin})

  # computes merged raster data.
  base_data = base_raster_copy.bands[0].data()
  addon_data = addon_raster_copy.bands[0].data()

  indices_to_sum = np.logical_and(~np.isnan(base_data), ~np.isnan(addon_data))
  indices_to_replace = np.logical_and(np.isnan(base_data), ~np.isnan(addon_data))
  base_data[indices_to_sum] = (base_data[indices_to_sum] + addon_data[indices_to_sum]) / 2
  base_data[indices_to_replace] = addon_data[indices_to_replace]

  base_raster_copy.bands[0].data(base_data)
  return base_raster_copy

def fetch_condition_rasters(priorities, region, project_area):
  kScale = [300.0, -300.0]
  kSkew = [0, 0]
  kSrid = 9822

  all_rasters = {}

  for p in priorities:
    condition_rasters = get_condition_rasters(p, region)
    origin = [sys.float_info.max, sys.float_info.min]
    rfinal = GDALRaster({
      "width": 1,
      "height": 1,
      "srid": kSrid,
      "origin": origin,
      "scale": kScale,
      "skew": kSkew,
      "bands": [{"nodata_value": np.nan}]
    })

    for cr in condition_rasters:
      r = cr.raster

      # Checking for overlapping extents is faster than issuing a query that checks for overlaps. 
      if not raster_extent_overlaps_project_area(r, project_area):
        continue
      rfinal = mosaic_rasters(rfinal, r)

    all_rasters[p] = rfinal

  return all_rasters

def get_condition_data(raster, polygon):
  data = {"mean": 0, "count": 0}
  e = polygon.extent
  o = raster.origin
  s = raster.scale

  if s[0] > 0:
    min_x = int(np.floor((e[0] - o[0]) / s[0]))
    max_x = int(np.ceil((e[2] - o[0]) / s[0]))
  else:
    min_x = int(np.floor((e[2] - o[0]) / s[0]))
    max_x = int(np.ceil((e[0] - o[0]) / s[0]))

  if s[1] > 0:
    min_y = int(np.floor((e[1] - o[1]) / s[1]))
    max_y = int(np.ceil((e[3] - o[1]) / s[1]))
  else:
    min_y = int(np.floor((e[3] - o[1]) / s[1]))
    max_y = int(np.ceil((e[1] - o[1]) / s[1]))

  data = raster.bands[0].data()

  sum = 0
  count = 0
  for y in range(min_y, max_y + 1, 1):
    for x in range(min_x, max_x + 1, 1):
      d = data[y][x]
      if np.isnan(d):
        continue

      # TODO: adjust these equations for the case where skew != [0, 0]
      xpoly = o[0] + x*s[0]
      ypoly = o[1] + y*s[1] 
      p = Point((xpoly, ypoly))
      if not p.within(polygon):
        continue

      sum = sum + d
      count = count + 1

  if count == 0:
    return {"mean": 0, "count": 0}
  return {"mean": sum/count, "count": count}

def transform_into_forsys_df_data(condition_rasters, boundaries, project_area):
  kConditionPrefix = "cond"
  kPriorityPrefix = "p"
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
    # raster boundary seems to be 80 units off from the huc-12 boundaries.
    # TODO: adjust raster data.
    geo = project_area.intersection(b.geometry)
    geo = translate_polygon(geo, 80, 0)
    geo.transform(CoordTransform(SpatialReference(4269), SpatialReference(9822)))

    # TODO: set project_area ID from an external source
    data['proj_id'].append(1)
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
      data[kPriorityPrefix + "_" + c].append((1.0 - d['mean']) * d['count'])

  return data 

# Runs a forsys scenario sets call.
def run_forsys_scenario_sets(npdf, priorities):
  kPriorityPrefix = "p"

  import rpy2.robjects as robjects
  robjects.r.source(os.path.join(settings.BASE_DIR, 'forsys/scenario_sets.R'))
  scenario_sets_function_r = robjects.globalenv['scenario_sets']
 
  # TODO: add inputs for thresholds.
  # TODO: clean-up: pass header names (e.g. proj_id) into scenario_sets_function_r.
  rdf = convert_dictionary_of_lists_to_rdf(npdf)

  priority_headers = []
  for p in priorities:
    priority_headers.append(kPriorityPrefix + "_" + p)

  forsys_output = scenario_sets_function_r(rdf,
                                           robjects.FloatVector([np.ceil(np.sum(npdf['area']))]),
                                           robjects.StrVector(priority_headers))

  # TODO: add logic for applying constraints to forsys_output.

  result = {}
  result['top_stands'] = convert_rdf_to_pddf(forsys_output[0])
  result['top_projects'] = convert_rdf_to_pddf(forsys_output[1])
  return result

# Returns JSon data for a forsys scenario set call.
def scenario_set(request: HttpRequest) -> HttpResponse:
  try:
    # TODO: fetch region, priorities, stand type, and project area as url parameters.
    save_debug_info = True
    region = 'sierra_cascade_inyo'
    priorities = ['fire_dynamics', 'forest_resilience', 'species_diversity']

    huc12_id = 43

    project_area = Polygon( ((-120.14015536869722, 37.05413814388948),
                             (-120.18409937110482, 36.9321584213366),
                             (-119.93422142411087, 36.94003252840713),
                             (-120.03710286062301, 36.99713288358574),
                             (-120.14015536869722, 37.05413814388948)) )
    project_area.srid = 4269
    if not project_area.valid:
      raise ValueError("invalid project area: %s"%project_area.valid_reason) 

    # raster boundary seems to be 80 units off from the huc-12 boundaries.
    # TODO: adjust raster data.
    project_area_translated = translate_polygon(project_area, 80, 0)
    project_area_raster = project_area_translated.clone()
    project_area_raster.transform(CoordTransform(SpatialReference(4269), SpatialReference(9822)))

    response = {}
    if (save_debug_info):
      response['debug'] = {}

    # Filters boundaries by boundary_id.
    # TODO: add more stand options. For the existing solution, project areas drawn manually are divided into stands according to HUC-12 boundaries.
    boundaries = BoundaryDetails.objects.filter(boundary_id=huc12_id).filter(geometry__intersects=project_area)
    if (save_debug_info):
      response['debug']['huc-12 boundaries'] = get_boundary_debug_info(boundaries, project_area) 

    # Fetches priority rasters for the given project area.
    condition_rasters = fetch_condition_rasters(priorities, region, project_area_raster)
    if (save_debug_info):
      response['debug']['rasters'] = get_raster_debug_info(condition_rasters)

    # Transforms rasters into dataframes.
    # TODO: instead of using HUC-12 boundaries to delineate stands, add options for using individual pixels and individual latitudinal bars.
    dataframe_data = transform_into_forsys_df_data(condition_rasters, boundaries, project_area)
    dataframe = pd.DataFrame(data=dataframe_data)
    response['forsys'] = {}
    response['forsys']['input_df'] = dataframe.to_json()

    results = run_forsys_scenario_sets(dataframe_data, priorities)
    response['forsys']['output_stand'] = results['top_stands'].to_json()
    response['forsys']['output_project'] = results['top_projects'].to_json()

    # TODO: configure response to potentially show stand coordinates and other signals necessary for the UI. 

    return HttpResponse(JsonResponse(response), content_type='application/json')
 
  except Exception as e:
    logger.error('scenario set error: ' + str(e))
    return HttpResponseBadRequest("Ill-formed request: " + str(e))
