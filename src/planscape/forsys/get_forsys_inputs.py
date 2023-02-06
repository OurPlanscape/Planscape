import json
from typing import TypedDict

from conditions.models import BaseCondition, Condition
from conditions.raster_utils import compute_condition_score_from_raster
from django.conf import settings
from django.contrib.gis.gdal import CoordTransform, SpatialReference
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.http import QueryDict
from plan.models import Project, ProjectArea


# A list of coordinates representing a polygon.
class PolygonFromUrlParams(TypedDict):
    coordinates: list[tuple[float, float]]


# A project area composed of multiple disjoint polygons.
class ProjectAreaFromUrlParams(TypedDict):
    # Project ID
    id: int
    # SRID
    srid: int
    # Disjoint polygons that are part of the project area.
    polygons: list[PolygonFromUrlParams]


# Gathers forsys input parameters from url params, database lookups, or a
# combination of the two.
# Of note, the option to set all forsys input paramters via url parameters is
# intended for backend debugging purposes while the option to set most forsys
# input parameters via database lookups is intended for production.
class ForsysProjectAreaRankingRequestParams():
    # Constants for parsing url parameters.
    _URL_USE_ONLY_URL_PARAMS = 'set_all_params_via_url_with_default_values'
    _URL_REGION = 'region'
    _URL_PRIORITIES = 'priorities'
    _URL_PROJECT_AREAS = 'project_areas'

    # Constants that act as default values when parsing url parameters.
    _DEFAULT_REGION = 'sierra_cascade_inyo'
    _DEFAULT_PRIORITIES = ['fire_dynamics',
                           'forest_resilience', 'species_diversity']

    # TODO: make regions and priorities enums to make error checking easier.
    # TODO: add fields for constraints, costs, treatments, and thresholds.
    # The planning region.
    region: str
    # Conditions whose AP scores will be considered when ranking projects.
    priorities: list[str]
    # Project areas to be ranked. A project area may consist of multiple
    # disjoint polygons. The dict is keyed by project ID.
    project_areas: dict[int, MultiPolygon]

    def __init__(self, params: QueryDict) -> None:
        if bool(params.get(self._URL_USE_ONLY_URL_PARAMS, False)):
            # This is used for debugging purposes.
            self._read_url_params_with_defaults(params)
        else:
            self._read_db_params(params)

    def _read_url_params_with_defaults(self, params: QueryDict) -> None:
        self.region = params.get(
            self._URL_REGION, self._DEFAULT_REGION)
        self.priorities = params.getlist(
            self._URL_PRIORITIES, self._DEFAULT_PRIORITIES)
        if self._URL_PROJECT_AREAS in params:
            self.project_areas = self._read_project_areas_from_url_params(
                params)
        else:
            self.project_areas = self._get_default_project_areas()

    def _read_db_params(self, params: QueryDict) -> None:
        try:
            project_id = params['project_id']
            project = Project.objects.get(id=project_id)
            project_areas = ProjectArea.objects.filter(project=project_id)
            self.region = project.plan.region_name

            self.priorities = [
                BaseCondition.objects.get(
                    id=c.condition_dataset_id).condition_name
                for c in project.priorities.all()]

            self.project_areas = {}
            for area in project_areas:
                self.project_areas[area.pk] = area.project_area
        except Exception as e:
            raise Exception("Ill-formed request: " + str(e))

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

    def _read_project_areas_from_url_params(
            self, params: QueryDict) -> dict[int, MultiPolygon]:
        project_areas = {}
        for project_area_str in params.getlist(self._URL_PROJECT_AREAS):
            project_area = ProjectAreaFromUrlParams(
                json.loads(project_area_str))
            self._check_project_area_from_url_params_fields_exist(project_area)
            srid = 4269 if 'srid' not in project_area.keys(
            ) else project_area['srid']  # TODO: make 4269 a constant.
            polygons: list[Polygon] = []
            for p in project_area['polygons']:
                polygon = Polygon(tuple(p['coordinates']))
                polygon.srid = srid
                if not polygon.valid:
                    raise Exception("polygon described by %s is invalid - %s" %
                                    (project_area_str, polygon.valid_reason))
                polygons.append(polygon)
            if len(polygons) == 0:
                continue
            m = MultiPolygon(polygons)
            m.srid = srid
            project_areas[project_area['id']] = m
        return project_areas

    def _check_project_area_from_url_params_fields_exist(
            self, project_area: ProjectAreaFromUrlParams) -> None:
        if 'polygons' not in project_area.keys():
            raise Exception('project area missing field, "polygons"')
        if len(project_area['polygons']) == 0:
            raise Exception('project area field, "polygons" is an empty list')
        if 'id' not in project_area.keys():
            raise Exception('project area missing field, "id"')


# Forsys input dataframe headers.
class ForsysInputHeaders():
    # Constant headers for project and stand ID's, area, and cost.
    FORSYS_PROJECT_ID_HEADER = "proj_id"
    FORSYS_STAND_ID_HEADER = "stand_id"
    FORSYS_AREA_HEADER = "area"
    FORSYS_COST_HEADER = "cost"

    # Header prefixes for conditions and priorities.
    _CONDITION_PREFIX = "c_"
    _PRIORITY_PREFIX = "p_"

    # List of headers for priorities.
    # Downstream, this must be in the same order as constructor input
    # priorities.
    priority_headers: list[str]

    def __init__(self, priorities: list[str]) -> None:
        self.priority_headers = []

        for p in priorities:
            self.priority_headers.append(self.priority_header(p))

    # Returns a priority header givn a priority string.
    def priority_header(self, priority: str) -> str:
        return self._PRIORITY_PREFIX + priority

    # Reteurns a condition hader given a condition string.
    def condition_header(self, condition: str) -> str:
        return self._CONDITION_PREFIX + condition


class ForsysProjectAreaRankingInput():
    # dictionary representing a forsys input dataframe.
    forsys_input: dict[str, list]

    def __init__(
            self, params: ForsysProjectAreaRankingRequestParams,
            headers: ForsysInputHeaders) -> None:
        region = params.region
        priorities = params.priorities
        project_areas = params.project_areas

        condition_ids_to_names = self._get_condition_ids_to_names(
            region, priorities)
        conditions = self._get_conditions(condition_ids_to_names.keys())

        self.forsys_input = self._get_initialized_forsys_input(
            headers, priorities)

        for proj_id in project_areas.keys():
            geo = self._get_raster_geo(project_areas[proj_id])

            self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(proj_id)
            self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(proj_id)
            self.forsys_input[headers.FORSYS_AREA_HEADER].append(geo.area)
            # TODO: figure out the right value for the units: 5000 is just a
            # placeholder.
            self.forsys_input[headers.FORSYS_COST_HEADER].append(
                geo.area * 5000)
            for c in conditions:
                name = condition_ids_to_names[c.condition_dataset_id]
                score = compute_condition_score_from_raster(
                    geo, c.raster_name)
                if score is None:
                    raise Exception(
                        "no score was retrieved for condition, %s" % name)
                self.forsys_input[headers.condition_header(name)].append(score)
                # TODO: fix this to be sum(1.0 - score) rather than
                # mean(1.0 - score)
                self.forsys_input[headers.priority_header(
                    name)].append(1.0 - score)

    def _get_condition_ids_to_names(self, region: str,
                                    priorities: list) -> dict[int, str]:
        condition_ids_to_names = {
            c.pk: c.condition_name
            for c in BaseCondition.objects.filter(region_name=region).filter(
                condition_name__in=priorities).all()}
        if len(priorities) != len(condition_ids_to_names.keys()):
            raise Exception("of %d priorities, only %d had base conditions" % (
                len(priorities), len(condition_ids_to_names.keys())))
        return condition_ids_to_names

    def _get_conditions(self, condition_ids: list[int]) -> list[Condition]:
        conditions = list(Condition.objects.filter(
            condition_dataset_id__in=condition_ids).filter(
            is_raw=False).all())
        if len(condition_ids) != len(conditions):
            raise Exception(
                "of %d priorities, only %d had conditions" %
                (len(condition_ids),
                 len(conditions)))
        return conditions

    def _get_initialized_forsys_input(self, headers: ForsysInputHeaders,
                                      priorities: list[str]) -> dict[str, list]:
        forsys_input = {}
        forsys_input[headers.FORSYS_PROJECT_ID_HEADER] = []
        forsys_input[headers.FORSYS_STAND_ID_HEADER] = []
        forsys_input[headers.FORSYS_AREA_HEADER] = []
        forsys_input[headers.FORSYS_COST_HEADER] = []
        for p in priorities:
            forsys_input[headers.condition_header(p)] = []
            forsys_input[headers.priority_header(p)] = []
        return forsys_input

    # Transforms a geometry into the raster SRS.

    def _get_raster_geo(self, geo: GEOSGeometry) -> GEOSGeometry:
        if geo.srid == settings.CRS_FOR_RASTERS:
            return geo
        geo.transform(
            CoordTransform(
                SpatialReference(geo.srid),
                SpatialReference(settings.CRS_9822_PROJ4)))
        geo.srid = settings.CRS_FOR_RASTERS
        return geo
