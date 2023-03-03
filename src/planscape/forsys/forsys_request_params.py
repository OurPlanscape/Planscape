from enum import IntEnum
import json
from typing import TypedDict

from conditions.models import BaseCondition
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.http import HttpRequest, QueryDict
from plan.models import Project, ProjectArea
from plan.views import get_plan_by_id, get_user

_URL_REQUEST_PARAMS_TYPE = "request_type"


class ForsysRankingRequestParamsType(IntEnum):
    DATABASE = 0  # ForsysRankingRequestParamsFromDb
    URL_WITH_DEFAULTS = 1  # ForsysRankingRequestParamsFromUrlWithDefaults


class ForsysGenerationRequestParamsType(IntEnum):
    DATABASE = 0  # ForsysGenerationRequestParamsFromDb
    URL_WITH_DEFAULTS = 1  # ForsysGenerationRequestParamsFromUrlWithDefaults


def _read_common_url_params(self, params: QueryDict) -> None:
    self.region = params.get(
        self._URL_REGION, self._DEFAULT_REGION)
    self.priorities = params.getlist(
        self._URL_PRIORITIES, self._DEFAULT_PRIORITIES)
    self.priority_weights = params.getlist(
        self._URL_PRIORITY_WEIGHTS,
        [1 for i in range(len(self.priorities))])
    self.priority_weights = [float(pw) for pw in self.priority_weights]
    if len(self.priorities) != len(self.priority_weights):
        raise AssertionError(
            "expected %d priority weights, instead, %d were given" %
            (len(self.priorities),
                len(self.priority_weights)))


# Gathers forsys input parameters from url params, database lookups, or a
# combination of the two.
# Of note, the option to set all forsys input paramters via url parameters is
# intended for backend debugging purposes while the option to set most forsys
# input parameters via database lookups is intended for production.
class ForsysRankingRequestParams():
    # TODO: make regions and priorities enums to make error checking easier.
    # TODO: add fields for costs, treatments, and stand-level constraints.
    # The planning region.
    region: str
    # Conditions whose AP scores will be considered when ranking projects.
    priorities: list[str]
    # Weights associated with the priorities.
    # Must be same length as priorities.
    # If not set explicitly, this is a vector of 1's by default.
    priority_weights: list[float]
    # Project areas to be ranked. A project area may consist of multiple
    # disjoint polygons. The dict is keyed by project ID.
    project_areas: dict[int, MultiPolygon]
    # Global constraints applied to the entire set of projects.
    max_area_in_km2: float | None  # unit: km squared
    max_cost_in_usd: float | None  # unit: USD

    def __init__(self):
        self.region = None
        self.priorities = None
        self.priority_weights = None
        self.project_areas = None
        self.max_area_in_km2 = None
        self.max_cost_in_usd = None


class ForsysRankingRequestParamsFromDb(ForsysRankingRequestParams):
    def __init__(self, params: QueryDict):
        ForsysRankingRequestParams.__init__(self)
        self._read_db_params(params)

    def _read_db_params(self, params: QueryDict) -> None:
        try:
            # TODO: re-use plan/views retrieval methods.
            project_id = params['project_id']
            project = Project.objects.get(id=project_id)
            project_areas = ProjectArea.objects.filter(project=project_id)
            self.region = project.plan.region_name

            self.priorities = [
                BaseCondition.objects.get(
                    id=c.condition_dataset_id).condition_name
                for c in project.priorities.all()]
            # TODO: add logic for reading priority weights from db.
            self.priority_weights = [1 for p in self.priorities]

            self.project_areas = {}
            for area in project_areas:
                self.project_areas[area.pk] = area.project_area
        except Exception as e:
            raise Exception("Ill-formed request: " + str(e))


class ForsysRankingRequestParamsFromUrlWithDefaults(ForsysRankingRequestParams):
    # Constants for parsing url parameters.
    _URL_USE_ONLY_URL_PARAMS = 'set_all_params_via_url_with_default_values'
    _URL_REGION = 'region'
    _URL_PRIORITIES = 'priorities'
    _URL_PRIORITY_WEIGHTS = 'priority_weights'
    _URL_MAX_AREA = 'max_area'
    _URL_MAX_COST = 'max_cost'

    # Constants that act as default values when parsing url parameters.
    _DEFAULT_REGION = 'sierra_cascade_inyo'
    _DEFAULT_PRIORITIES = ['fire_dynamics',
                           'forest_resilience', 'species_diversity']

    def __init__(self, params: QueryDict) -> None:
        ForsysRankingRequestParams.__init__(self)
        self._read_url_params_with_defaults(params)

    def _read_url_params_with_defaults(self, params: QueryDict) -> None:
        _read_common_url_params(self, params)
        self.project_areas = self._get_default_project_areas()
        self.max_area_in_km2 = self._read_positive_float(params,
                                                         self._URL_MAX_AREA)
        self.max_cost_in_usd = self._read_positive_float(params,
                                                         self._URL_MAX_COST)

    def _get_default_project_areas(self) -> dict[int, MultiPolygon]:
        srid = 4269
        p1 = Polygon(((-120.14015536869722, 39.05413814388948),
                     (-120.18409937110482, 39.48622140686506),
                     (-119.93422142411087, 39.48622140686506),
                     (-119.93422142411087, 39.05413814388948),
                     (-120.14015536869722, 39.05413814388948)))
        p1.srid = srid
        p2 = Polygon(((-120.14015536869722, 38.05413814388948),
                     (-120.18409937110482, 38.48622140686506),
                     (-119.93422142411087, 38.48622140686506),
                     (-119.93422142411087, 38.05413814388948),
                     (-120.14015536869722, 38.05413814388948)))
        p2.srid = srid
        p3 = Polygon(((-121.14015536869722, 39.05413814388948),
                     (-121.18409937110482, 39.48622140686506),
                     (-120.53422142411087, 39.48622140686506),
                     (-120.53422142411087, 39.05413814388948),
                     (-121.14015536869722, 39.05413814388948)))
        p3.srid = srid
        m1 = MultiPolygon(p1, p2)
        m1.srid = srid
        m2 = MultiPolygon(p3)
        m2.srid = srid
        return {1: m1,
                2: m2}

    # If field is present, returns field value but raises an exception if the
    # field value isn't positive.
    # IF field isn't present, returns None.
    def _read_positive_float(
            self, params: QueryDict, query_param: str) -> float | None:
        v = params.get(query_param, None)
        if v is None:
            return None
        v = float(v)
        if v <= 0:
            raise Exception(
                "expected param, %s, to have a positive value" % query_param)
        return v


# Gathers forsys input parameters from url params, database lookups, or a
# combination of the two.
# Of note, the option to set all forsys input paramters via url parameters is
# intended for backend debugging purposes while the option to set most forsys
# input parameters via database lookups is intended for production.
class ForsysGenerationRequestParams():
    # TODO: make regions and priorities enums to make error checking easier.
    # TODO: add fields for costs, treatments, and global, project-level, and
    # stand-level constraints.
    # The planning region.
    region: str
    # Conditions whose AP scores will be considered when ranking projects.
    priorities: list[str]
    # Weights associated with the priorities.
    # Must be same length as priorities.
    # If not set explicitly, this is a vector of 1's by default.
    priority_weights: list[float]
    # Planning area geometry. Projects are generated within the planning area.
    planning_area: MultiPolygon

    def __init__(self):
        self.region = None
        self.priorities = None
        self.priority_weights = None
        self.planning_area = None


class ForsysGenerationRequestParamsFromUrlWithDefaults(
        ForsysGenerationRequestParams):
    # Constants for parsing url parameters.
    _URL_USE_ONLY_URL_PARAMS = 'set_all_params_via_url_with_default_values'
    _URL_REGION = 'region'
    _URL_PRIORITIES = 'priorities'
    _URL_PRIORITY_WEIGHTS = 'priority_weights'
    _URL_PLANNING_AREA = 'planning_area'

    # Constants that act as default values when parsing url parameters.
    _DEFAULT_REGION = 'sierra_cascade_inyo'
    _DEFAULT_PRIORITIES = ['fire_dynamics',
                           'forest_resilience', 'species_diversity']

    def __init__(self, params: QueryDict) -> None:
        ForsysGenerationRequestParams.__init__(self)
        self._read_url_params_with_defaults(params)

    def _read_url_params_with_defaults(self, params: QueryDict) -> None:
        _read_common_url_params(self, params)
        self.planning_area = self._get_default_planning_area()

    def _get_default_planning_area(self) -> MultiPolygon:
        srid = 4269
        p1 = Polygon(((-120.14015536869722, 39.05413814388948),
                     (-120.18409937110482, 39.48622140686506),
                     (-119.93422142411087, 39.48622140686506),
                     (-119.93422142411087, 39.05413814388948),
                     (-120.14015536869722, 39.05413814388948)))
        p1.srid = srid
        p2 = Polygon(((-120.14015536869722, 38.05413814388948),
                     (-120.18409937110482, 38.48622140686506),
                     (-119.93422142411087, 38.48622140686506),
                     (-119.93422142411087, 38.05413814388948),
                     (-120.14015536869722, 38.05413814388948)))
        p2.srid = srid
        mp = MultiPolygon(p1, p2)
        mp.srid = srid
        return mp


class ForsysGenerationRequestParamsFromDb(
        ForsysGenerationRequestParamsFromUrlWithDefaults):
    def __init__(self, request: HttpRequest) -> None:
        # TODO: init with ForsysGenerationRequestParams instead once DB
        # configuratino has been updated.
        ForsysGenerationRequestParamsFromUrlWithDefaults.__init__(
            self, request.GET)
        self._read_db_params(request)

    def _read_db_params(self, request: HttpRequest) -> None:
        params = request.GET

        user = get_user(request)
        plan = get_plan_by_id(user, params)
        self.region = plan.region_name
        self.planning_area = plan.geometry

        # TODO: read priorities and weights from DB once models have been
        # updated.


def get_ranking_request_params(
        params: QueryDict) -> ForsysRankingRequestParams:
    type = ForsysRankingRequestParamsType(
        int(params.get(_URL_REQUEST_PARAMS_TYPE, 0)))
    if type == ForsysRankingRequestParamsType.DATABASE:
        return ForsysRankingRequestParamsFromDb(params)
    elif type == ForsysRankingRequestParamsType.URL_WITH_DEFAULTS:
        return ForsysRankingRequestParamsFromUrlWithDefaults(params)
    else:
        raise Exception("ranking request type was not recognized")


def get_generation_request_params(
        request: HttpRequest) -> ForsysGenerationRequestParams:
    params = request.GET
    type = ForsysGenerationRequestParamsType(int(
        params.get(_URL_REQUEST_PARAMS_TYPE, 0)))
    if type == ForsysGenerationRequestParamsType.DATABASE:
        return ForsysGenerationRequestParamsFromDb(request)
    elif type == ForsysGenerationRequestParamsType.URL_WITH_DEFAULTS:
        return ForsysGenerationRequestParamsFromUrlWithDefaults(params)
    else:
        raise Exception("generation request type was not recognized")
