import json
import logging
import os


from config.boundary_config import BoundaryConfig
from django.db import connection
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)

from django.conf import settings

# Configure global logging.
logger = logging.getLogger(__name__)


# Global variable for the PillarConfig, so that the configuration file is read once.
boundary_config = BoundaryConfig(
    os.path.join(settings.BASE_DIR, 'config/boundary.json'))

def get_config(params: QueryDict):

    assert isinstance(params['region_name'], str)
    region_name = params['region_name']

    # Read from boundary config
    config_path = os.path.join(
        settings.BASE_DIR, 'config/boundary.json')
    boundary_config = json.load(open(config_path, 'r'))

    for region in boundary_config['regions']:
        if region_name == region['region_name']:
            return region['boundaries']
        

    return None


def config(request: HttpRequest) -> HttpResponse:
    boundary = get_config(request.GET)
    return JsonResponse(boundary, safe = False)

