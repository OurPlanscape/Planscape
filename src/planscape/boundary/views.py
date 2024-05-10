import json
import logging
import os


from django.http import (
    HttpRequest,
    HttpResponse,
    JsonResponse,
    QueryDict,
)

from django.conf import settings

# Configure global logging.
logger = logging.getLogger(__name__)


def get_config(params: QueryDict):
    assert isinstance(params["region_name"], str)
    region_name = params["region_name"]

    # Read from boundary config
    config_path = os.path.join(settings.BASE_DIR, "config/boundary.json")
    boundary_config = json.load(open(config_path, "r"))

    for region in boundary_config["regions"]:
        if region_name == region["region_name"]:
            return region["boundaries"]

    return None


def config(request: HttpRequest) -> HttpResponse:
    boundary = get_config(request.GET)
    return JsonResponse(boundary, safe=False)
