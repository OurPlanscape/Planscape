import json
import logging
import os
from typing import cast

from config.colormap_config import ColormapConfig
from decouple import config as cfg
from django.db import connection
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)
from django.conf import settings

# Configure global logging.
logger = logging.getLogger(__name__)

# Name of the table and column from models.py.
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'

# Global variable for the ColormapConfig, so that the configuration file is read once.
PLANSCAPE_ROOT_DIRECTORY = cast(str, cfg('PLANSCAPE_ROOT_DIRECTORY'))
colormap_config = ColormapConfig(
    os.path.join(settings.BASE_DIR, 'config/colormap.json'))


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

        # Get the style, which is the colormap; default is "viridis"
        styles = params.get('styles', 'viridis')
        assert isinstance(styles, str)
        colormap = colormap_config.get_colormap_string(styles)
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
        settings.BASE_DIR, 'config/conditions.json')
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
        logger.error('WMS error: ' + str(e))
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def config(request: HttpRequest) -> HttpResponse:
    region = get_config(request.GET)
    return JsonResponse(region)


def colormap(request: HttpRequest) -> HttpResponse:
    colormap = None
    colormap_name = request.GET.get('colormap', None)
    if colormap_name is not None:
        colormap = colormap_config.get_config(colormap_name)
    if colormap is None:
        return HttpResponseBadRequest("Ill-formed request: bad colormap name")
    return JsonResponse(colormap)
