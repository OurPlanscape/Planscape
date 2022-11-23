from django.http import HttpRequest, HttpResponse, QueryDict
from django.db import connection


# Name of the table and column from models.py.
RASTER_TABLE = 'conditions_conditionraster'
RASTER_COLUMN = 'raster'
RASTER_NAME_COLUMN = 'name'


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
        colormap = 'fire'
        cursor.callproc('get_rast_tile', (params['format'], width, height, srid,
                        bbox_coords[0], bbox_coords[1], bbox_coords[2], bbox_coords[3],
                        colormap, 'public', RASTER_TABLE, RASTER_COLUMN, RASTER_NAME_COLUMN,
                        params['layers']))
        row = cursor.fetchone()
    return row


def wms(request: HttpRequest) -> HttpResponse:
    image = get_wms(request.GET)
    return HttpResponse(image, content_type=request.GET['format'])
