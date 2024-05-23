import json
import logging
import os

from conditions.services import flatten_region
from django.http import (
    HttpRequest,
    HttpResponse,
    JsonResponse,
    QueryDict,
)
from django.conf import settings

logger = logging.getLogger(__name__)


def get_config(params: QueryDict):
    # Get region name
    assert isinstance(params["region_name"], str)
    region_name = params["region_name"]
    flat = bool(params.get("flat", False))
    # Read from conditions config
    config_path = os.path.join(settings.BASE_DIR, "config/conditions.json")
    conditions_config = json.load(open(config_path, "r"))

    # Extract specific region data from JSON
    for region in conditions_config["regions"]:
        if region_name == region["region_name"]:
            if flat:
                return flatten_region(region)
            return region

    return None


def config(request: HttpRequest) -> HttpResponse:
    region = get_config(request.GET)
    return JsonResponse(region, safe=False)


def metrics(request: HttpRequest) -> HttpResponse:
    """
    Gets a dictionary of metrics with their configurations to be used to format scenario results

    Returns: metric_dict: a dictionary of metrics and their configurations

    Required params:
    region_name (string): Name of the region the metrics are needed from
    metric_paths (string): Stringified JSON of the names of the pillars (string[]), elements (string[]), and metrics (string[]) in the metric 'path' (pillar/element/metric)
    """

    params = request.GET
    assert isinstance(params["region_name"], str)
    region_name = params["region_name"]
    assert isinstance(params["metric_paths"], str)
    paths = json.loads(params["metric_paths"])

    metric_dict = {}
    config_path = os.path.join(settings.BASE_DIR, "config/conditions.json")
    conditions_config = json.load(open(config_path, "r"))
    for region in conditions_config["regions"]:
        if region_name == region["region_name"]:
            region_data = region
            for pillar in region_data["pillars"]:
                if pillar["pillar_name"] in paths["pillars"]:
                    pillar_data = pillar
                    for element in pillar_data["elements"]:
                        if element["element_name"] in paths["elements"]:
                            element_data = element
                            for metric in element_data["metrics"]:
                                if metric["metric_name"] in paths["metrics"]:
                                    metric_dict[metric["metric_name"]] = metric
    return JsonResponse(metric_dict)
