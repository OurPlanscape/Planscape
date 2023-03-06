from enum import IntEnum

from boundary.models import BoundaryDetails
from conditions.models import BaseCondition
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.http import HttpRequest, QueryDict
from plan.models import Project, ProjectArea
from plan.views import get_plan_by_id, get_user
from forsys.merge_polygons import merge_polygons

# URL parameter name for ForsysRankingRequestParamsType or
# ForsysGenerationRequestParamsType.
# Parameter value is expected to be an integer.
_URL_REQUEST_PARAMS_TYPE = "request_type"


class ForsysRankingRequestParamsType(IntEnum):
    DATABASE = 0  # ForsysRankingRequestParamsFromDb
    URL_WITH_DEFAULTS = 1  # ForsysRankingRequestParamsFromUrlWithDefaults


class ForsysGenerationRequestParamsType(IntEnum):
    DATABASE = 0  # ForsysGenerationRequestParamsFromDb
    URL_WITH_DEFAULTS = 1  # ForsysGenerationRequestParamsFromUrlWithDefaults
    HUC12_WITH_DEFAULTS = 2  # ForsysGenerationRequestParamsFromHuc12
    SILVER_CREEK_WITH_DEFAULTS = 3  # SilverCreekForsysGenerationParams
    COW_CREEK_WITH_DEFAULTS = 4  # CowCreekForsysGenerationParams
    MIDDLE_FORK_WITH_DEFAULTS = 5  # MiddleForkForsysGenerationParams


# Reads url parameters common to both
# ForsysRankingRequestParamsFromUrlWithDefaults and
# ForsysGenerationRequestParamsFromUrlWithDefaults.
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


# A class containing forsys ranking input parameters.
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


# Looks up forsys ranking parameters from DB.
# This is intended for production.
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


# Looks up forsys ranking parameters from URL parameters.
# Also provides default values if any url parameters are missing.
# This is intended for debugging purposes.
class ForsysRankingRequestParamsFromUrlWithDefaults(ForsysRankingRequestParams):
    # Constants for parsing url parameters.
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


# A class containing forsys generation input parameters.
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


# Looks up forsys generation parameters from URL parameters.
# Also provides default values if any url parameters are missing.
# This is intended for debugging purposes.
class ForsysGenerationRequestParamsFromUrlWithDefaults(
        ForsysGenerationRequestParams):
    # Constants for parsing url parameters.
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


# Looks up forsys generation parameters from DB.
# This is intended for production.
# TODO: Update logic so that all parameters are set from DB (presently, some
# are set via url parameters)
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


# Sets planning area from HUC-12 boundary names.
# Sets default priorities to th ones used for experimenting with realistic data.
class ForsysGenerationRequestParamsFromHuc12(
        ForsysGenerationRequestParamsFromUrlWithDefaults):
    # The ID representing HUC-12 boundaries in the DB.
    _HUC12_ID = 43

    # Constants for parsing url parameters.
    _URL_HUC12_NAMES = 'huc12_names'

    # Constants that act as default values when parsing url parameters.
    _DEFAULT_HUC12_NAMES = ['Little Silver Creek-Silver Creek']

    # Default priorities that are retrieved.
    _DEFAULT_PRIORITIES = [
        'california_spotted_owl', 'storage', 'functional_fire',
        'forest_structure', 'max_sdi']

    # huc-12 area nams.
    huc12_names: list[str]

    def __init__(self, params: QueryDict):
        ForsysGenerationRequestParamsFromUrlWithDefaults.__init__(self, params)
        self.huc12_names = params.getlist(
            self._URL_HUC12_NAMES, self._DEFAULT_HUC12_NAMES)
        self.planning_area = self._get_planning_area(self.huc12_names)

    def _get_planning_area(self, huc12_names: list[str]) -> GEOSGeometry:
        huc12s = BoundaryDetails.objects.filter(
            boundary_id=self._HUC12_ID).filter(shape_name__in=huc12_names)
        polygons = [huc12.geometry for huc12 in huc12s]
        return merge_polygons(polygons, 0)


class SilverCreekForsysGenerationParams(ForsysGenerationRequestParamsFromHuc12):
    _DEFAULT_HUC12_NAMES = [
        'Little Silver Creek-Silver Creek',
        'South Fork Rubicon River',
        'Jones Fork Silver Creek',
        'Brush Creek-South Fork American River',
        'South Fork Silver Creek'
    ]


class CowCreekForsysGenerationParams(ForsysGenerationRequestParamsFromHuc12):
    _DEFAULT_HUC12_NAMES = [
        'Upper Old Cow Creek',
        'Lower Old Cow Creek',
        'Upper South Cow Creek',
        'Lower South Cow Creek',
        'Glendenning Creek',
        'Clover Creek',
        'Oak Run Creek'
    ]


class MiddleForkForsysGenerationParams(ForsysGenerationRequestParamsFromHuc12):
    _DEFAULT_HUC12_NAMES = [
        'Middle Fork Bishop Creek',
        'South Fork Bishop Creek',
        'Evolution Creek',
        'Headwaters Middle Fork Kings River',
        'Goddard Creek',
        'Goddard Canyon-South Fork San Joaquin River',
        'Upper Middle Fork Kings River'
    ]


# Returns ForsysRankingRequestParams based on url parameter value for the
# parameter name in _URL_REQUEST_PARAMS_TYPE.
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


# Returns ForsysGenerationRequestParams based on url parameter value for the
# parameter name in _URL_REQUEST_PARAMS_TYPE.
def get_generation_request_params(
        request: HttpRequest) -> ForsysGenerationRequestParams:
    params = request.GET
    type = ForsysGenerationRequestParamsType(int(
        params.get(_URL_REQUEST_PARAMS_TYPE, 0)))
    if type == ForsysGenerationRequestParamsType.DATABASE:
        return ForsysGenerationRequestParamsFromDb(request)
    elif type == ForsysGenerationRequestParamsType.URL_WITH_DEFAULTS:
        return ForsysGenerationRequestParamsFromUrlWithDefaults(params)
    elif type == ForsysGenerationRequestParamsType.HUC12_WITH_DEFAULTS:
        return ForsysGenerationRequestParamsFromHuc12(params)
    elif type == ForsysGenerationRequestParamsType.SILVER_CREEK_WITH_DEFAULTS:
        return SilverCreekForsysGenerationParams(params)
    elif type == ForsysGenerationRequestParamsType.COW_CREEK_WITH_DEFAULTS:
        return CowCreekForsysGenerationParams(params)
    elif type == ForsysGenerationRequestParamsType.MIDDLE_FORK_WITH_DEFAULTS:
        return MiddleForkForsysGenerationParams(params)
    else:
        raise Exception("generation request type was not recognized")
