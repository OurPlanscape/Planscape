from django.http import HttpRequest, HttpResponse, QueryDict
from django.db import connection


def get_wms(params:QueryDict):
    with connection.cursor() as cursor:
        # Get the bounding box
        bbox = params['bbox']
        assert isinstance(bbox, str)
        bbox_coords = [float(c) for c in bbox.split(',')]

        # Get the SRID
        assert isinstance(params['srs'], str)
        srid = int(params['srs'].removeprefix('EPSG:'))

        # See ST_ColorMap documentation
        colormap = 'fire'
        cursor.callproc('get_rast_tile', (params['format'], params['width'], params['height'],
                        srid, bbox_coords[0], bbox_coords[1], bbox_coords[2], bbox_coords[3],
                        colormap, 'public', 'wms_current'))
        row = cursor.fetchone()
    return row


def wms(request: HttpRequest) -> HttpResponse:
    image = get_wms(request.GET)
    return HttpResponse(image, content_type=request.GET['format'])
