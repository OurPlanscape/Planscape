from conditions.models import BaseCondition, Condition
from conditions.raster_utils import (ConditionPixelValues,
                                     compute_condition_stats_from_raster,
                                     get_condition_values_from_raster,
                                     get_raster_geo)
from django.contrib.gis.geos import GEOSGeometry, Polygon
from forsys.forsys_request_params import (
    ForsysGenerationRequestParams, ForsysRankingRequestParams)
from planscape import settings


# Forsys input dataframe headers.
class ForsysInputHeaders():
    # Constant headers for project and stand ID's, area, and cost.
    FORSYS_PROJECT_ID_HEADER = "proj_id"
    FORSYS_STAND_ID_HEADER = "stand_id"
    FORSYS_AREA_HEADER = "area"
    FORSYS_COST_HEADER = "cost"
    # Constant header for geo wkt.
    # Only used for generation, not prioritization.
    FORSYS_GEO_WKT_HEADER = "geo"

    # Header prefixes for conditions and priorities.
    _CONDITION_PREFIX = "c_"
    _PRIORITY_PREFIX = "p_"

    # List of headers for priorities.
    # Downstream, this must be listed in the same order as constructor input
    # priorities.
    priority_headers: list[str]

    def __init__(self, priorities: list[str]) -> None:
        self.priority_headers = []

        for p in priorities:
            self.priority_headers.append(self.get_priority_header(p))

    # Returns a priority header givn a priority string.
    def get_priority_header(self, priority: str) -> str:
        return self._PRIORITY_PREFIX + priority

    # Reteurns a condition hader given a condition string.
    def get_condition_header(self, condition: str) -> str:
        return self._CONDITION_PREFIX + condition


# Creates a dictionary keyed by ForsysInputHeaders with values of empty lists.
# This is the starting point for both generation and prioritization.
def _get_initialized_forsys_input_with_common_headers(
        headers: ForsysInputHeaders,
        priorities: list[str]) -> dict[str, list]:
    forsys_input = {}
    forsys_input[headers.FORSYS_PROJECT_ID_HEADER] = []
    forsys_input[headers.FORSYS_STAND_ID_HEADER] = []
    forsys_input[headers.FORSYS_AREA_HEADER] = []
    forsys_input[headers.FORSYS_COST_HEADER] = []
    for p in priorities:
        forsys_input[headers.get_priority_header(p)] = []
    return forsys_input


# Given a list of priorities (i.e. condition names), returns a dictionary
# mapping condition ID's to condition names.
# Raises an error if any of the priorities don't have a corresponding condition.
# TODO: this may not be necessary if we use Django's "select_related" function.
def _get_base_condition_ids_to_names(region: str,
                                     priorities: list) -> dict[int, str]:
    base_condition_ids_to_names = {
        c.pk: c.condition_name
        for c in BaseCondition.objects.filter(region_name=region).filter(
            condition_name__in=priorities).all()}
    if len(priorities) != len(base_condition_ids_to_names.keys()):
        raise Exception("of %d priorities, only %d had base conditions" % (
            len(priorities), len(base_condition_ids_to_names.keys())))
    return base_condition_ids_to_names


# Given a list of condition ID's, returns a list of conditions.
# Output conditions may not be listed in the same order as condition_ids.
# Raises an error if any of the input condition ID's don't have a corresponding
# condition.
def _get_conditions(condition_ids: list[int]) -> list[Condition]:
    conditions = list(Condition.objects.filter(
        condition_dataset_id__in=condition_ids).filter(
        is_raw=False).all())
    if len(condition_ids) != len(conditions):
        raise Exception(
            "of %d priorities, only %d had conditions" %
            (len(condition_ids),
                len(conditions)))
    return conditions


class ForsysRankingInput():
    # Treatment cost per kilometer-squared (in USD)
    # TODO: make this variable based on a user input and/or a treatment cost
    # raster.
    TREATMENT_COST_PER_KM_SQUARED = 5000 * 1000 * 1000

    # A dictionary representing a forsys input dataframe.
    # In the dataframe, headers correspond to ForsysInputHeaders headers. Each
    # row represents a unique stand.
    # Dictionary keys are dataframe headers. Dictionary values are lists
    # corresponding to columns below each dataframe header.
    forsys_input: dict[str, list]

    def __init__(
            self, params: ForsysRankingRequestParams,
            headers: ForsysInputHeaders) -> None:
        region = params.region
        priorities = params.priorities
        project_areas = params.project_areas

        base_condition_ids_to_names = _get_base_condition_ids_to_names(
            region, priorities)
        conditions = _get_conditions(base_condition_ids_to_names.keys())

        self.forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities)

        for proj_id in project_areas.keys():
            geo = get_raster_geo(project_areas[proj_id])

            self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(proj_id)
            # The entire projoect area is represented by a single stand.
            self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(proj_id)

            num_pixels = 0  # number of non-NaN raster pixels captured by geo.
            for c in conditions:
                # TODO: replace this with select_related.
                name = base_condition_ids_to_names[c.condition_dataset_id]
                stats = compute_condition_stats_from_raster(
                    geo, c.raster_name)
                if stats['count'] == 0:
                    raise Exception(
                        "no score was retrieved for condition, %s" % name)
                self.forsys_input[headers.get_priority_header(
                    name)].append(stats['count'] - stats['sum'])

                # The number of non-NaN pixels captured by geo may vary between
                # condition rasters because some rasters have large undefined
                # patches. Taking the maximum count across all conditions
                # should account for the more egregious cases of undefined
                # patches.
                num_pixels = max(stats['count'], num_pixels)

            area = num_pixels * settings.RASTER_PIXEL_AREA
            self.forsys_input[headers.FORSYS_AREA_HEADER].append(area)
            self.forsys_input[headers.FORSYS_COST_HEADER].append(
                area * self.TREATMENT_COST_PER_KM_SQUARED)


class ForsysGenerationInput():
    # Treatment cost per kilometer-squared (in USD)
    # TODO: make this variable based on a user input and/or a treatment cost
    # raster.
    TREATMENT_COST_PER_KM_SQUARED = 5000 * 1000 * 1000

    # A dictionary representing a forsys input dataframe.
    # In the dataframe, headers correspond to ForsysInputHeaders headers. Each
    # row represents a unique stand.
    # Dictionary keys are dataframe headers. Dictionary values are lists
    # corresponding to columns below each dataframe header.
    forsys_input: dict[str, list]

    # ----- Intermediate data -----
    # Maps condition names to retrieved ConditionPixelValues instances.
    _conditions_to_raster_values: dict[str, ConditionPixelValues]
    # The origin coordinate used when merging ConditionPixelValues instances, which may have different top-left coordinates, across all conditions.
    _topleft_coords: tuple[float, float]
    # Raw condition values merged via embedded dictionaries keyed by x pixel
    # index, y pixel index, and condition name.
    _pixel_dist_x_to_y_to_condition_to_values = dict[int,
                                                     dict[int,
                                                          dict[str, float]]]

    def __init__(
            self, params: ForsysGenerationRequestParams,
            headers: ForsysInputHeaders) -> None:
        region = params.region
        priorities = params.priorities
        planning_area = params.planning_area

        self.forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities)
        self.forsys_input[headers.FORSYS_GEO_WKT_HEADER] = []

        geo = get_raster_geo(planning_area)

        self._fetch_condition_raster_values(geo, priorities, region)
        self._merge_condition_raster_values()
        self._convert_merged_condition_rasters_to_input_df(
            headers, len(priorities))

    # Fetches ConditionPixelValues instances and places them in
    # self._conditions_to_raster_values, a dictionary mapping condition names
    # to the ConditionPixelValues instances.
    def _fetch_condition_raster_values(
            self, geo: GEOSGeometry, priorities: list[str],
            region: str) -> None:

        base_condition_ids_to_names = _get_base_condition_ids_to_names(
            region, priorities)
        conditions = _get_conditions(base_condition_ids_to_names.keys())

        self._conditions_to_raster_values = {}
        self._topleft_coords = None
        for c in conditions:
            # TODO: replace this with select_related.
            name = base_condition_ids_to_names[c.condition_dataset_id]
            values = get_condition_values_from_raster(geo, c.raster_name)
            self._conditions_to_raster_values[name] = values
            self._update_topleft_coords(values)

    # Updates self._topleft_coords if the one represented by
    # condition_pixel_values is further to the top-left corner according to the
    # raster scale.
    def _update_topleft_coords(
            self, condition_pixel_values: ConditionPixelValues) -> None:
        if condition_pixel_values["upper_left_coord_x"] is None:
            raise Exception("fetched poorly-formatted raster pixel data")
        if condition_pixel_values["upper_left_coord_y"] is None:
            raise Exception("fetched poorly-formatted raster pixel data")
        if self._topleft_coords is None:
            self._topleft_coords = (
                condition_pixel_values["upper_left_coord_x"],
                condition_pixel_values["upper_left_coord_y"])
            return
        self._topleft_coords = (
            self._select_topleft_coord(
                self._topleft_coords[0],
                condition_pixel_values["upper_left_coord_x"],
                settings.CRS_9822_SCALE[0]),
            self._select_topleft_coord(
                self._topleft_coords[1],
                condition_pixel_values["upper_left_coord_y"],
                settings.CRS_9822_SCALE[1]))

    # Given two coordinates, selects the one that represents a lower pixel
    # distance index according to the scale.
    def _select_topleft_coord(
            self, coord1: float, coord2: float, scale: float) -> float:
        return min(coord1, coord2) if scale > 0 else max(coord1, coord2)

    # Merges the conditionPixelValues instances in self
    # _conditions_to_raster_values into a dictionary mapping x pixel positions
    # to y pixel positions to condition names to values. x and y pixels are
    # computed using self._topleft_coords.
    def _merge_condition_raster_values(self) -> None:
        self._pixel_dist_x_to_y_to_condition_to_values = {}
        for condition_name in self._conditions_to_raster_values.keys():
            values = self._conditions_to_raster_values[condition_name]
            xdiff = self._get_pixel_dist_diff(
                values["upper_left_coord_x"],
                self._topleft_coords[0],
                settings.CRS_9822_SCALE[0])
            ydiff = self._get_pixel_dist_diff(
                values["upper_left_coord_y"],
                self._topleft_coords[1],
                settings.CRS_9822_SCALE[1])
            for i in range(len(values["pixel_dist_x"])):
                x = values["pixel_dist_x"][i] + xdiff
                y = values["pixel_dist_y"][i] + ydiff
                value = values["values"][i]
                self._insert_value_in_position_and_condition_dict(
                    x, y, condition_name, value)

    # Computes the distance, in pixels, between two coordinates.
    def _get_pixel_dist_diff(
            self, coord: float, origin_coord: float, scale: float) -> int:
        return int((coord - origin_coord) / scale)

    # Inserts a value into self._pixel_dist_x_to_y_to_condition_to_values.
    def _insert_value_in_position_and_condition_dict(
            self, x: int, y: int, condition: str, value: float) -> None:
        d = self._pixel_dist_x_to_y_to_condition_to_values
        if x not in d.keys():
            d[x] = {}

        d = d[x]
        if y not in d.keys():
            d[y] = {}

        d = d[y]
        d[condition] = value

    # Converts self._pixel_dist_x_to_y_to_condition_to_values into forsys input
    # dataframe data.
    def _convert_merged_condition_rasters_to_input_df(
            self, headers: ForsysInputHeaders, num_priorities: int) -> None:
        DUMMY_PROJECT_ID = 0
        stand_id = 0
        dict_x = self._pixel_dist_x_to_y_to_condition_to_values
        for x in dict_x.keys():
            dict_y = dict_x[x]
            for y in dict_y.keys():
                dict_condition = dict_y[y]
                if num_priorities != len(dict_condition.keys()):
                    continue
                stand_id = stand_id + 1
                self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(
                    stand_id)
                self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(
                    DUMMY_PROJECT_ID)
                self.forsys_input[headers.FORSYS_AREA_HEADER].append(
                    settings.RASTER_PIXEL_AREA)
                self.forsys_input[headers.FORSYS_COST_HEADER].append(
                    settings.RASTER_PIXEL_AREA * self.TREATMENT_COST_PER_KM_SQUARED)
                self.forsys_input[headers.FORSYS_GEO_WKT_HEADER].append(
                    self._get_raster_pixel_geo(x, y).wkt)
                for p in dict_condition.keys():
                    self.forsys_input[headers.get_priority_header(
                        p)].append(dict_condition[p])

    # Returns a Polygon representing the raster pixel at pixel position,
    # (x, y).
    def _get_raster_pixel_geo(self, x: int, y: int) -> Polygon:
        xmin = self._topleft_coords[0] + settings.CRS_9822_SCALE[0] * x
        xmax = xmin + settings.CRS_9822_SCALE[0]
        ymin = self._topleft_coords[1] + settings.CRS_9822_SCALE[1] * y
        ymax = ymin + settings.CRS_9822_SCALE[1]
        geo = Polygon(((xmin, ymin),
                       (xmin, ymax),
                       (xmax, ymax),
                       (xmax, ymin),
                       (xmin, ymin)))
        geo.srid = settings.CRS_FOR_RASTERS
        return geo
