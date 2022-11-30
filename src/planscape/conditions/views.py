import json
import os
from typing import cast

from decouple import config as cfg
from django.db import connection
from django.http import HttpRequest, HttpResponse, JsonResponse, QueryDict

PLANSCAPE_ROOT_DIRECTORY = cast(str, cfg('PLANSCAPE_ROOT_DIRECTORY'))

# Name of the table and column from models.py.
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'


def get_colormap(colormap: str | None):
    if colormap == 'viridis':
        return (
            '100% 68    1  84\n'
            ' 75% 59   82 139\n'
            ' 50% 33  145 140\n'
            ' 25% 94  201  98\n'
            '  0% 253 231  37\n'
            'nv 0 0 0 0')
    elif colormap == 'wistia':
        return (
            '100% 252 127   0\n'
            ' 75% 255 160   0\n'
            ' 50% 255 189   0\n'
            ' 25% 255 232  26\n'
            '  0% 228 255 122\n'
            'nv 0 0 0 0')
    else:
        return 'fire'


def get_wms(params: QueryDict):
    with connection.cursor() as cursor:
        # Get the width and height
        assert isinstance(params['width'], str)
        assert isinstance(params['height'], str)
        width = int(params['width'])
        height = int(params['height'])

        # Get the bounding box
        bbox = params['bbox']
        assert isinstance(bbox, str)
        bbox_coords = [float(c) for c in bbox.split(',')]

        # Get the SRID
        assert isinstance(params['srs'], str)
        srid = int(params['srs'].removeprefix('EPSG:'))

        # See ST_ColorMap documentation for format.
        colormap = get_colormap('viridis')
        cursor.callproc('get_rast_tile', (params['format'], width, height, srid,
                        bbox_coords[0], bbox_coords[1], bbox_coords[2], bbox_coords[3],
                        colormap, 'public', RASTER_TABLE, RASTER_COLUMN, RASTER_NAME_COLUMN,
                        params['layers']))
        row = cursor.fetchone()
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
    image = get_wms(request.GET)
    return HttpResponse(image, content_type=request.GET['format'])


def config(request: HttpRequest) -> HttpResponse:
    region = get_config(request.GET)
    return JsonResponse(region)
