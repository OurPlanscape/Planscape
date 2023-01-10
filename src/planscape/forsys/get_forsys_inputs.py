from django.contrib.gis.geos import MultiPolygon, Polygon
from django.http import QueryDict
from typing import TypedDict

import json


class PolygonFromUrlParams(TypedDict):
    coordinates: list[tuple[float, float]]


class ProjectAreaFromUrlParams(TypedDict):
    # Project ID
    id: int
    # SRID
    srid: int
    # Disjoint polygons that are part of the project area.
    polygons: list[PolygonFromUrlParams]


class ForsysScenarioSetRequestParams():
    # If true, additional debug information is sent to the json file.
    save_debug_info: bool
    # The planning region.
    region: str
    # Conditions whose AP scores will be considered when ranking projects.
    priorities: list[str]
    # Project areas to be ranked. A project area may be a multipolygon.
    project_areas: dict[int, MultiPolygon]

    # TODO: add fields for constraints, costs, treatments, and thresholds.


    def __init__(self, params: QueryDict) -> None:
        if params.get(self.__UP_USE_URL_PARAMS, False):
            # This is used for debugging purposes.
            self.__read_url_params_with_defaults(params)
            self.save_debug_info = True
        else:
            self.__read_db_params(params)


    def __read_url_params_with_defaults(self, params: QueryDict) -> None:
        self.region = params.get(
            self.__UP_REGION, self.__DEFAULT_REGION)
        self.priorities = params.getlist(
            self.__UP_PRIORITIES, self.__DEFAULT_PRIORITIES)
        if self.__UP_PROJECT_AREAS in params:
            self.project_areas = self.__read_project_areas_from_url_params(
                params)
        else:
            self.project_areas = self.__get_default_project_areas()


    def __read_db_params(self, params: QueryDict) -> None:
        # TODO: add db read logic.
        raise Exception(
            'WIP. Please set set_all_params_via_url_params to true.')


    __UP_USE_URL_PARAMS = 'set_all_params_via_url_params'
    __UP_REGION = 'region'
    __UP_PRIORITIES = 'priorities'
    __UP_PROJECT_AREAS = 'project_areas'

    __DEFAULT_REGION = 'sierra_cascade_inyo'
    __DEFAULT_PRIORITIES = ['fire_dynamics',
                            'forest_resilience', 'species_diversity']

    def __get_default_project_areas(self) -> dict[int, MultiPolygon]:
        p1 = Polygon(((-120.14015536869722, 39.05413814388948),
                     (-120.18409937110482, 39.48622140686506),
                     (-119.93422142411087, 39.48622140686506),
                     (-119.93422142411087, 39.05413814388948),
                     (-120.14015536869722, 39.05413814388948)))
        p1.srid = 4269
        p2 = Polygon(((-120.14015536869722, 38.05413814388948),
                     (-120.18409937110482, 38.48622140686506),
                     (-119.93422142411087, 38.48622140686506),
                     (-119.93422142411087, 38.05413814388948),
                     (-120.14015536869722, 38.05413814388948)))
        p2.srid = 4269
        p3 = Polygon(((-118.14015536869722, 39.05413814388948),
                     (-118.18409937110482, 39.48622140686506),
                     (-119.53422142411087, 39.48622140686506),
                     (-119.53422142411087, 39.05413814388948),
                     (-118.14015536869722, 39.05413814388948)))
        p3.srid = 4269
        return {1: MultiPolygon(p1, p2),
                2: MultiPolygon(p3)}
                

    def __read_project_areas_from_url_params(self, params: QueryDict) -> dict[int, MultiPolygon]:
        project_areas = {}
        for project_area_str in params.getlist(self.__UP_PROJECT_AREAS):
            project_area = ProjectAreaFromUrlParams(
                json.loads(project_area_str))
            polygons: list[Polygon] = []
            for p in project_area['polygons']:
                polygon = Polygon(tuple(p['coordinates']))
                polygon.srid = project_area['srid']
                if not polygon.valid:
                    raise Exception("polygon described by %s is invalid - %s" %
                                    (project_area_str, polygon.valid_reason))
                polygons.append(polygon)
            project_areas[project_area['id']] = MultiPolygon(polygons)
        return project_areas
