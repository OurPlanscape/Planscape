from django.contrib.gis.geos import Polygon
from django.http import JsonResponse, QueryDict

import json


# Request parameters for a Forsys scenario set call.
# The following URL parameters are parsed:
# save_debug_info
#   Whether or not debug information should be returned in the HTTPResponse
#   The value can be 0, 1, True, or False.
# region
#   The planning region.
#   The value is one of the following strings:
#       TODO: list the regions
# priorities
#   Conditions to be prioritized when estimating benefit scores.
#   The value is a comma-separated list consisting of a subset of the following conditions:
#       TODO: list the conditions
class ForsysScenarioSetRequestParams():
    def _get_default_polygon() -> Polygon:
        p = Polygon(((-120.14015536869722, 39.05413814388948),
                     (-120.18409937110482, 39.48622140686506),
                     (-119.93422142411087, 39.48622140686506),
                     (-119.93422142411087, 39.05413814388948),
                     (-120.14015536869722, 39.05413814388948)))
        p.srid = 4269
        return p

    def __init__(self, params: QueryDict) -> None:
        if params.has_key('save_debug_info'):
            self.save_debug_info = bool(params['save_debug_info'])
        if params.has_key('region'):
            self.region = params['region']
        if params.has_key('priorities'):
            self.priorities = self.priorities = ','.split(params['priorities'])

    # ------------------------------------------
    # Parameters (and their default assignments)
    # ------------------------------------------
    # Whether or not debug information should be returned in the HTTPResponse.
    # url parameter is 'save_debug_info', value can be 0, 1, True, or False.
    save_debug_info: bool = False
    # The planning region.
    # url parameter is 'region', value is a string.
    region: str = 'sierra_cascade_inyo'
    # Conditions to be prioritized when estimating benefit scores.
    # url parameter is 'priorities', value is a comma-separated list of conditions.
    priorities: list[str] = ['fire_dynamics',
                             'forest_resilience', 'species_diversity']
    # The project areas to be compared.
    # url parameter is 'project_areas', value is a json whose first layer is {'}
    project_areas: list[Polygon] = [__get_default_polygon()]

    # TODO: read the parameters above from a database given a scenario set id.
