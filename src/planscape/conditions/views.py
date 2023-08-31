import json
import logging
import os

from config.colormap_config import ColormapConfig
from config.conditions_config import PillarConfig
from django.db import connection
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseBadRequest,
    JsonResponse,
    QueryDict,
)
from django.conf import settings

# Configure global logging.
logger = logging.getLogger(__name__)

# Name of the table and column from models.py.
RASTER_TABLE = "conditions_conditionraster"
RASTER_COLUMN = "raster"
RASTER_NAME_COLUMN = "name"

# Global variable for the PillarConfig, so that the configuration file is read once.
pillar_config = PillarConfig(os.path.join(settings.BASE_DIR, "config/conditions.json"))

# Global variable for the ColormapConfig, so that the configuration file is read once.
colormap_config = ColormapConfig(
    os.path.join(settings.BASE_DIR, "config/colormap.json")
)


def get_config(params: QueryDict):
    # Get region name
    assert isinstance(params["region_name"], str)
    region_name = params["region_name"]

    # Read from conditions config
    config_path = os.path.join(settings.BASE_DIR, "config/conditions.json")
    conditions_config = json.load(open(config_path, "r"))

    # Extract specific region data from JSON
    for region in conditions_config["regions"]:
        if region_name == region["region_name"]:
            return region

    return None


def config(request: HttpRequest) -> HttpResponse:
    region = get_config(request.GET)
    return JsonResponse(region)


def colormap(request: HttpRequest) -> HttpResponse:
    colormap = None
    colormap_name = request.GET.get("colormap", None)
    if colormap_name is not None:
        colormap = colormap_config.get_config(colormap_name)
    if colormap is None:
        return HttpResponseBadRequest("Ill-formed request: bad colormap name")
    return JsonResponse(colormap)
