from enum import IntEnum

from boundary.models import BoundaryDetails
from conditions.models import BaseCondition
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.http import HttpRequest, QueryDict
from forsys.default_forsys_request_params_polygons import (
    get_default_planning_area, get_default_project_areas)
from forsys.merge_polygons import merge_polygons
from plan.models import (Project, ProjectArea, Plan,
                         Scenario, ScenarioWeightedPriority)
from plan.views import get_scenario_by_id, get_user
from planscape import settings

# URL parameter name for ForsysRankingRequestParamsType or
# ForsysGenerationRequestParamsType.
# Parameter value is expected to be an integer.
_URL_REQUEST_PARAMS_TYPE = "request_type"


class ForsysRankingRequestParamsType(IntEnum):
    DATABASE = 0  # ForsysRankingRequestParamsFromDb
    ALL_DEFAULTS = 1  # ForsysRankingRequestParamsFromUrlWithDefaults


class ForsysGenerationRequestParamsType(IntEnum):
    DATABASE = 0  # ForsysGenerationRequestParamsFromDb
    ALL_DEFAULTS = 1  # ForsysGenerationRequestParamsFromUrlWithDefaults
    HUC12S_WITH_DEFAULTS = 2  # ForsysGenerationRequestParamsFromHuc12
    SILVER_CREEK_HUC12S_WITH_DEFAULTS = 3  # SilverCreekForsysGenerationParams
    COW_CREEK_HUC12S_WITH_DEFAULTS = 4  # CowCreekForsysGenerationParams
    MIDDLE_FORK_HUC12S_WITH_DEFAULTS = 5  # MiddleForkForsysGenerationParams


# Whether and how to cluster before running Patchmax for project area
# generation.
class ClusterAlgorithmType(IntEnum):
    NONE = 0
    HIERARCHICAL_IN_PYTHON = 1
    KMEANS_IN_R = 2


class ClusterAlgorithmRequestParams():
    # Constants for parsing url parameters.
    # cluster algorithm types are listed in enum, ClusterAlgorithmType.
    _URL_CLUSTER_TYPE = 'cluster_algorithm_type'
    # For pre-patchmax clustering: this is the desired number of clusters.
    _URL_NUM_CLUSTERS = 'num_clusters'
    # For pre-patchax clustering: pixel_index_weight is one of the input
    # parameters for ClusteredStands. It controls the extent to which we favor
    # rounder, smaller clusters.
    _URL_CLUSTER_PIXEL_INDEX_WEIGHT = 'cluster_pixel_index_weight'

    # Constants that act as default values when parsing url parameters.
    # By default, no clustering occurs.
    _DEFAULT_CLUSTER_TYPE = ClusterAlgorithmType.NONE
    # TODO: select default parameter values.
    _DEFAULT_NUM_CLUSTERS = 500
    _DEFAULT_CLUSTER_PIXEL_INDEX_WEIGHT = 0.01

    # Cluster algorithm type.
    cluster_algorithm_type: ClusterAlgorithmType
    # Number of clusters.
    num_clusters: int
    # Cluster pixel index weight - this controls the roundness and size of
    # clusters, if enabled.
    pixel_index_weight: float

    def __init__(self, params: QueryDict) -> None:
        self._read_url_params_with_defaults(params)

    def _read_url_params_with_defaults(self, params: QueryDict) -> None:
        self.cluster_algorithm_type = ClusterAlgorithmType(int(params.get(
            self._URL_CLUSTER_TYPE, self._DEFAULT_CLUSTER_TYPE)))
        self.num_clusters = int(params.get(
            self._URL_NUM_CLUSTERS, self._DEFAULT_NUM_CLUSTERS))
        if self.num_clusters <= 0:
            raise Exception("expected num_clusters to be > 0")
        self.pixel_index_weight = float(params.get(
            self._URL_CLUSTER_PIXEL_INDEX_WEIGHT, self._DEFAULT_CLUSTER_PIXEL_INDEX_WEIGHT))
        if self.pixel_index_weight < 0:
            raise Exception("expected cluster_pixel_index_weight to be > 0")


# TODO: incorporate this with RankingRequestParams, too.
class DbRequestParams():
    # Constants for parsing url parameters.
    # Scenario ID indicates the scenario to be processed.
    _URL_SCENARIO_ID = 'scenario_id'
    # A boolean representing whether Forsys output data will be saved to the DB.
    _URL_WRITE_TO_DB = 'write_to_db'

    # In production, the user can be accessed via get_user(request); however,
    # for backend debugging purposes, this url parameter is also available for
    # use if settings.DEBUG is true.
    _URL_DEBUG_USER_ID = 'debug_user_id'

    def __init__(self, request: HttpRequest,) -> None:
        self.write_to_db = None
        self.scenario = None
        self.user = self._get_user(request)

    # If true, the output data of a Forsys run will be saved to the DB.
    write_to_db: bool
    # The scenario.
    # This guides the write-to-db functions:
    # - If none, an entirely new plan, project, and scenario are written to the
    #   DB along with Forsys output data.
    # - Otherwise, Forsys output data is saved to this scenario.
    scenario: Scenario | None
    # The user.
    # This is typically an HttpRequest attribute.
    # If settings.DEBUG is true, however, this may also be set via url
    # parameter, debug_user_id.
    # This informs Scenario retrieval (since only scenarios visible to the user
    # may be retrieved) and is a field value when saving Forsys output data to
    # the DB.
    user: User

    def _get_user(self, request: HttpRequest) -> User:
        if hasattr(request, 'user'):
            user = get_user(request)
            if user is not None:
                return user

        params = request.GET
        if settings.DEBUG and self._URL_DEBUG_USER_ID in params.keys():
            if not isinstance(params[self._URL_DEBUG_USER_ID], str):
                raise Exception(
                    "expected parameter, debug_user_id, to have a string value")
            user_id = int(params.get(self._URL_DEBUG_USER_ID, "0"))
            return User.objects.get(id=user_id)

        return None


# When Forsys parameters are read from url parameters with default values
# (for the sake of e2e tests), no scenario needs to be retrieved and, by
# default, write_to_db is false.
class DbRequestParamsForGenerationFromUrlWithDefaults(DbRequestParams):
    def __init__(self, request: HttpRequest):
        DbRequestParams.__init__(self, request)
        params = request.GET
        self.write_to_db = params.get(
            DbRequestParams._URL_WRITE_TO_DB, False)
        self.scenario = None


# When Forsys parameters are gleaned from DB table values (for production), a
# scenario is retrieved, and, by default, write_to_db is true.
class DbRequestParamsForGenerationFromDb(DbRequestParams):
    def __init__(self, request: HttpRequest):
        DbRequestParams.__init__(self, request)
        params = request.GET
        self.write_to_db = params.get(
            DbRequestParams._URL_WRITE_TO_DB, True)
        self.scenario = get_scenario_by_id(
            self.user, self._URL_SCENARIO_ID, params)


# Parameters for deciding whether a stand is eligible for treatment.
# TODO: make it possible to parse these parameters from URL and/or read them
# from the DB.
class StandEligibilityParams:
    # If true, stands occupied by buildings are deemed ineligible for treatment.
    filter_by_buildings: bool

    # If true, stands with slope greater than max_slope_in_percent_rise are 
    # deemed ineligible for treatment.
    filter_by_slope: bool
    max_slope_in_percent_rise: float

    # If true, stands occupied by roads (proximity=0) are deemed ineligible for 
    # treatment while stands with road proximity greater than 
    # max_distance_from_road_in_meters are filtered.
    filter_by_road_proximity: bool
    max_distance_from_road_in_meters: float

    def __init__(self):
        self.filter_by_buildings = False
        self.filter_by_slope = False
        # This corresponds with 35 degrees.
        self.max_slope_in_percent_rise = 70.0
        self.filter_by_road_proximity = False
        # Advised to set this to ~60 meters, but that's not testable for 300m
        # data.
        # TODO: after switching to 30m data, change the default value.
        self.max_distance_from_road_in_meters = 1200.0


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

class CommonParams():
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

    

# A class containing forsys ranking input parameters.
class ForsysRankingRequestParams(CommonParams):
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
    _DEFAULT_REGION = 'sierra-nevada'
    _DEFAULT_PRIORITIES = ['fire_dynamics',
                           'forest_resilience', 'species_diversity']

    def __init__(self, params: QueryDict) -> None:
        ForsysRankingRequestParams.__init__(self)
        self._read_url_params_with_defaults(params)

    def _read_url_params_with_defaults(self, params: QueryDict) -> None:
        _read_common_url_params(self, params)
        self.project_areas = get_default_project_areas()
        self.max_area_in_km2 = self._read_positive_float(params,
                                                         self._URL_MAX_AREA)
        self.max_cost_in_usd = self._read_positive_float(params,
                                                         self._URL_MAX_COST)


# A class containing forsys generation input parameters.
class ForsysGenerationRequestParams(CommonParams):
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
    # Parameters informing clustering prior to running Patchmax project area
    # generation.
    cluster_params: ClusterAlgorithmRequestParams
    # Parameters informing whether Planscape will read and write to the DB.
    db_params: DbRequestParams
    # Parameters informing whether a stand can be included in a project area.
    stand_eligibility_params: StandEligibilityParams

    # Per-project constraints
    max_area_per_project_in_km2: float
    max_cost_per_project_in_usd: float | None

    # default values for these params, regardless of how params were generated
    _DEFAULT_MAX_AREA = 20
    
    def __init__(self):
        self.region = None
        self.priorities = None
        self.priority_weights = None
        self.planning_area = None
        self.cluster_params = None
        self.db_params = None
        self.max_area_per_project_in_km2 = self._DEFAULT_MAX_AREA
        self.max_cost_per_project_in_usd = None
        self.stand_eligibility_params = None

    # Returns a dictionary mapping priorities to priority weights.
    def get_priority_weights_dict(self) -> dict[str, float]:
        priority_weights = {}
        for i in range(len(self.priorities)):
            priority_weights[self.priorities[i]] = self.priority_weights[i]
        return priority_weights


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
    _URL_MAX_AREA_PER_PROJECT = 'max_area_per_project'
    _URL_MAX_COST_PER_PROJECT = 'max_cost_per_project'

    # Constants that act as default values when parsing url parameters.
    _DEFAULT_REGION = 'sierra-nevada'
    _DEFAULT_PRIORITIES = ['fire_dynamics',
                           'forest_resilience', 'species_diversity']

    def __init__(self, params: QueryDict) -> None:
        ForsysGenerationRequestParams.__init__(self)

        self.cluster_params = ClusterAlgorithmRequestParams(params)

        request = HttpRequest()
        request.GET = params
        self.db_params = DbRequestParamsForGenerationFromUrlWithDefaults(
            request)
        # TODO: add logic for parsing stand eligibility params from url params.
        self.stand_eligibility_params = StandEligibilityParams()

        self._read_url_params_with_defaults(params)

    def get_priority_weights_dict(self) -> dict[str, float]:
        return ForsysGenerationRequestParams.get_priority_weights_dict(self)

    def _read_url_params_with_defaults(self, params: QueryDict) -> None:
        _read_common_url_params(self, params)
        self.planning_area = get_default_planning_area()
        km2 = self._read_positive_float(params, self._URL_MAX_AREA_PER_PROJECT)
        if km2 is not None:
          self.max_area_per_project_in_km2 = km2
        self.max_cost_per_project_in_usd = self._read_positive_float(params,
                                                                     self._URL_MAX_COST_PER_PROJECT)

# Looks up forsys generation parameters from DB.
# This is intended for production.
# TODO: Update logic so that all parameters are set from DB (presently, some
# are set via url parameters)
class ForsysGenerationRequestParamsFromDb(
        ForsysGenerationRequestParamsFromUrlWithDefaults):
    def __init__(self, request: HttpRequest) -> None:
        ForsysGenerationRequestParams.__init__(self)

        # TODO: pass cluster parameters via DB.
        self.cluster_params = ClusterAlgorithmRequestParams(request.GET)

        self.db_params = DbRequestParamsForGenerationFromDb(request)

        # TODO: pass stand eligibility params via DB.
        self.stand_eligibility_params = StandEligibilityParams()

        self._validate_scenario(self.db_params.scenario)

        self._read_db_params()

    def _validate_scenario(self, scenario: Scenario):
        status = scenario.status
        if not (status == Scenario.ScenarioStatus.INITIALIZED or
                status == Scenario.ScenarioStatus.FAILED):
            raise Exception(
                "scenario status for scenario ID, %d" % (scenario.pk) +
                ", is %s (expected Initialized or Failed)" %
                (scenario.get_status_display()))

        # TODO: the model for scenario.project should be null=False.
        if scenario.project is None:
            raise Exception(
                "project is none for scenario ID, %d" % (scenario.pk))

    def _read_db_params(self) -> None:
        scenario = self.db_params.scenario

        project = scenario.project
        plan = Plan.objects.get(id=project.plan_id)
        self.region = plan.region_name
        # TODO: the model for plan.geometry should be null=False.
        self.planning_area = plan.geometry
        if self.planning_area is None:
            raise Exception(
                "geometry missing for plan ID, %d, for scenario ID, %d" %
                (plan.pk, self.db_write_params.scenario.pk))

        self.priorities, self.priority_weights = self._get_weighted_priorities(
            scenario)

        self.max_cost_per_project_in_usd = project.max_cost_per_project_in_usd
        # for backwards compatibility, don't assume this was defined in old projects
        km2 = project.max_area_per_project_in_km2
        if km2 is not None:
          self.max_area_per_project_in_km2 = km2

    def _get_weighted_priorities(
        self, scenario: Scenario
    ) -> tuple[list[str], list[float]]:
        priorities = []
        priority_weights = []
        for w in ScenarioWeightedPriority.objects.filter(scenario=scenario):
            priorities.append(w.priority.condition_dataset.condition_name)
            priority_weights.append(w.weight)
        if len(priorities) == 0:
            raise Exception(
                "no weighted priorities available for scenario ID, %d" %
                (scenario.id))
        return priorities, priority_weights


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
        'california_spotted_owl',
        'storage',
        'functional_fire',
        'forest_structure',
        'max_sdi'
    ]

    # huc-12 area nams.
    huc12_names: list[str]

    def __init__(self, params: QueryDict):
        ForsysGenerationRequestParamsFromUrlWithDefaults.__init__(self, params)
        self.huc12_names = params.getlist(
            self._URL_HUC12_NAMES, self._DEFAULT_HUC12_NAMES)
        self.planning_area = self._get_planning_area(self.huc12_names)

    def get_priority_weights_dict(self) -> dict[str, float]:
        return ForsysGenerationRequestParams.get_priority_weights_dict(self)

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

    def get_priority_weights_dict(self) -> dict[str, float]:
        return ForsysGenerationRequestParams.get_priority_weights_dict(self)


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

    def get_priority_weights_dict(self) -> dict[str, float]:
        return ForsysGenerationRequestParams.get_priority_weights_dict(self)


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

    def get_priority_weights_dict(self) -> dict[str, float]:
        return ForsysGenerationRequestParams.get_priority_weights_dict(self)


# Returns ForsysRankingRequestParams based on url parameter value for the
# parameter name in _URL_REQUEST_PARAMS_TYPE.
def get_ranking_request_params(
        params: QueryDict) -> ForsysRankingRequestParams:
    type = ForsysRankingRequestParamsType(
        int(params.get(_URL_REQUEST_PARAMS_TYPE, 0)))
    if type == ForsysRankingRequestParamsType.DATABASE:
        return ForsysRankingRequestParamsFromDb(params)
    elif type == ForsysRankingRequestParamsType.ALL_DEFAULTS:
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
    elif type == ForsysGenerationRequestParamsType.ALL_DEFAULTS:
        return ForsysGenerationRequestParamsFromUrlWithDefaults(params)
    elif type == ForsysGenerationRequestParamsType.HUC12S_WITH_DEFAULTS:
        return ForsysGenerationRequestParamsFromHuc12(params)
    elif type == \
            ForsysGenerationRequestParamsType.SILVER_CREEK_HUC12S_WITH_DEFAULTS:
        return SilverCreekForsysGenerationParams(params)
    elif type ==  \
            ForsysGenerationRequestParamsType.COW_CREEK_HUC12S_WITH_DEFAULTS:
        return CowCreekForsysGenerationParams(params)
    elif type == \
            ForsysGenerationRequestParamsType.MIDDLE_FORK_HUC12S_WITH_DEFAULTS:
        return MiddleForkForsysGenerationParams(params)
    else:
        raise Exception("generation request type was not recognized")
