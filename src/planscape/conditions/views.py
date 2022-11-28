from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest, QueryDict
from django.db import connection


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

        # See ST_ColorMap documentation for format of colormap
        colormap = 'fire'
        cursor.callproc('get_rast_tile', (format, width, height, srid,
                        bbox_coords[0], bbox_coords[1], bbox_coords[2], bbox_coords[3],
                        colormap, 'public', RASTER_TABLE, RASTER_COLUMN, RASTER_NAME_COLUMN,
                        layers))
        row = cursor.fetchone()
        if row is None or row[0] is None:
            raise ValueError("No data; check 'layers' parameter")
    return row


def wms(request: HttpRequest) -> HttpResponse:
    try:
        image = get_wms(request.GET)
        return HttpResponse(image, content_type=request.GET['format'])
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
