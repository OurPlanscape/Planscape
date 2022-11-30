import json
import os
from typing import cast

from conditions.colormap import get_colormap
from decouple import config as cfg
from django.db import connection
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)

PLANSCAPE_ROOT_DIRECTORY = cast(str, cfg('PLANSCAPE_ROOT_DIRECTORY'))

# Name of the table and column from models.py.
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'


def get_wms(params: QueryDict):
    with connection.cursor() as cursor:
        # Get the width and height
        if not isinstance(params['width'], str):
            raise TypeError("Illegal type for width")
        if not isinstance(params['height'], str):
            raise TypeError("Illegal type for height")
        width = int(params['width'])
        height = int(params['height'])

        # Get the bounding box
        if not isinstance(params['bbox'], str):
            raise TypeError("Illegal type for bbox")
        bbox_coords = [float(c) for c in params['bbox'].split(',')]

        # Get the SRID
        if not isinstance(params['srs'], str):
            raise TypeError("Illegal type for srs")
        srid = int(params['srs'].removeprefix('EPSG:'))

        # Get the format and layers parameters
        format = params.get('format', 'image/jpeg')
        layers = params.get('layers', None)
        if layers is None:
            raise ValueError("Must specify layers to select data layer")

        # Get the style, which is the colormap
        assert isinstance(params['styles'], str)
        styles = params.get('styles', 'viridis')
        colormap = get_colormap(styles)
        cursor.callproc('get_rast_tile', (format, width, height, srid,
                        bbox_coords[0], bbox_coords[1], bbox_coords[2], bbox_coords[3],
                        colormap, 'public', RASTER_TABLE, RASTER_COLUMN, RASTER_NAME_COLUMN,
                        layers))
        row = cursor.fetchone()
        if row is None or row[0] is None:
            raise ValueError("No data; check 'layers' parameter")
    return row


def get_config(params: QueryDict):
    # Get region name
    assert isinstance(params['region_name'], str)
    region_name = params['region_name']

    # Read from conditions config
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    conditions_config = json.load(open(config_path, 'r'))

    # Extract specific region data from JSON
    for region in conditions_config['regions']:
        if region_name == region['region_name']:
            return region

    return None


def wms(request: HttpRequest) -> HttpResponse:
    try:
        image = get_wms(request.GET)
        return HttpResponse(image, content_type=request.GET['format'])
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def config(request: HttpRequest) -> HttpResponse:
    region = get_config(request.GET)
    return JsonResponse(region)
