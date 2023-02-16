from conditions.models import BaseCondition, Condition
from conditions.raster_utils import (ConditionPixelValues,
                                     compute_condition_stats_from_raster,
                                     get_condition_values_from_raster,
                                     get_raster_geo)
from django.contrib.gis.geos import GEOSGeometry, Polygon
from forsys.forsys_request_params import (
    ForsysProjectAreaGenerationRequestParams,
    ForsysProjectAreaRankingRequestParams)
from planscape import settings


# Forsys input dataframe headers.
class ForsysInputHeaders():
    # Constant headers for project and stand ID's, area, and cost.
    FORSYS_PROJECT_ID_HEADER = "proj_id"
    FORSYS_STAND_ID_HEADER = "stand_id"
    FORSYS_AREA_HEADER = "area"
    FORSYS_COST_HEADER = "cost"
    FORSYS_GEO_WKT_HEADER = "geo"

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
            self.priority_headers.append(self.get_priority_header(p))

    # Returns a priority header givn a priority string.
    def get_priority_header(self, priority: str) -> str:
        return self._PRIORITY_PREFIX + priority

    # Reteurns a condition hader given a condition string.
    def get_condition_header(self, condition: str) -> str:
        return self._CONDITION_PREFIX + condition


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


class ForsysProjectAreaRankingInput():
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
            self, params: ForsysProjectAreaRankingRequestParams,
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


class ForsysProjectAreaGenerationInput():
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

    # Intermediate data.
    # Maps condition names to retrieved ConditionPixelValues instances.
    conditions_to_raster_values: dict[str, ConditionPixelValues]
    # The origin coordinate used when merging condition pixel values across all
    # conditions.
    topleft_coords: tuple[float, float]
    # Raw condition values merged via embedded dictionaries keyed by x pixel
    # index, y pixel index, and condition name.
    pixel_dist_x_to_y_to_condition_to_values = dict[int,
                                                    dict[int,
                                                         dict[str, float]]]

    def __init__(
            self, params: ForsysProjectAreaGenerationRequestParams,
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

    def _fetch_condition_raster_values(
            self, geo: GEOSGeometry, priorities: list[str],
            region: str) -> None:

        base_condition_ids_to_names = _get_base_condition_ids_to_names(
            region, priorities)
        conditions = _get_conditions(base_condition_ids_to_names.keys())

        self.conditions_to_raster_values = {}
        self.topleft_coords = None
        for c in conditions:
            # TODO: replace this with select_related.
            name = base_condition_ids_to_names[c.condition_dataset_id]
            values = get_condition_values_from_raster(geo, c.raster_name)
            self.conditions_to_raster_values[name] = values
            self.topleft_coords = self._update_topleft_coords(
                self.topleft_coords, values)

    def _update_topleft_coords(self, topleft_coords: tuple[float, float],
                               condition_pixel_values: ConditionPixelValues) -> tuple[float, float]:
        if condition_pixel_values["upper_left_coord_x"] is None:
            raise Exception("fetched poorly-formatted raster pixel data")
        if condition_pixel_values["upper_left_coord_y"] is None:
            raise Exception("fetched poorly-formatted raster pixel data")
        if topleft_coords is None:
            return (condition_pixel_values["upper_left_coord_x"],
                    condition_pixel_values["upper_left_coord_y"])
        return (
            self._update_topleft_coord(
                topleft_coords[0],
                condition_pixel_values["upper_left_coord_x"],
                settings.CRS_9822_SCALE[0]),
            self._update_topleft_coord(
                topleft_coords[1],
                condition_pixel_values["upper_left_coord_y"],
                settings.CRS_9822_SCALE[1]))

    def _update_topleft_coord(
            self, coord1: float, coord2: float, scale: float) -> float:
        return min(coord1, coord2) if scale > 0 else max(coord1, coord2)

    def _merge_condition_raster_values(self) -> None:
        self.pixel_dist_x_to_y_to_condition_to_values = {}
        for condition_name in self.conditions_to_raster_values.keys():
            values = self.conditions_to_raster_values[condition_name]
            xdiff = self._get_pixel_dist_diff(
                values["upper_left_coord_x"],
                self.topleft_coords[0],
                settings.CRS_9822_SCALE[0])
            ydiff = self._get_pixel_dist_diff(
                values["upper_left_coord_y"],
                self.topleft_coords[1],
                settings.CRS_9822_SCALE[1])
            for i in range(len(values["pixel_dist_x"])):
                x = values["pixel_dist_x"][i] + xdiff
                y = values["pixel_dist_y"][i] + ydiff
                value = values["values"][i]
                if x not in self.pixel_dist_x_to_y_to_condition_to_values.keys():
                    self.pixel_dist_x_to_y_to_condition_to_values[x] = {}
                if y not in self.pixel_dist_x_to_y_to_condition_to_values[x].keys():
                    self.pixel_dist_x_to_y_to_condition_to_values[x][y] = {}
                self.pixel_dist_x_to_y_to_condition_to_values[x][y][
                    condition_name] = value

    def _get_pixel_dist_diff(
            self, topleft_coord: float,
            target_topleft_coord: float, scale: float) -> int:
        return int((topleft_coord - target_topleft_coord) / scale)

    def _convert_merged_condition_rasters_to_input_df(
            self, headers: ForsysInputHeaders, num_priorities: int) -> None:
        stand_id = 0
        for x in self.pixel_dist_x_to_y_to_condition_to_values.keys():
            for y in self.pixel_dist_x_to_y_to_condition_to_values[x].keys():
                if num_priorities != len(
                        self.pixel_dist_x_to_y_to_condition_to_values[x]
                        [y].keys()):
                    continue
                stand_id = stand_id + 1
                self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(
                    stand_id)
                self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(0)
                self.forsys_input[headers.FORSYS_AREA_HEADER].append(
                    settings.RASTER_PIXEL_AREA)
                self.forsys_input[headers.FORSYS_COST_HEADER].append(
                    settings.RASTER_PIXEL_AREA * self.TREATMENT_COST_PER_KM_SQUARED)

                xmin = self.topleft_coords[0] + settings.CRS_9822_SCALE[0] * x
                xmax = xmin + settings.CRS_9822_SCALE[0]
                ymin = self.topleft_coords[1] + settings.CRS_9822_SCALE[1] * y
                ymax = ymin + settings.CRS_9822_SCALE[1]
                geo = Polygon(((xmin, ymin),
                               (xmin, ymax),
                               (xmax, ymax),
                               (xmax, ymin),
                               (xmin, ymin)))
                geo.srid = settings.CRS_FOR_RASTERS
                self.forsys_input[headers.FORSYS_GEO_WKT_HEADER].append(
                    geo.wkt)
                for p in self.pixel_dist_x_to_y_to_condition_to_values[x][y].keys():
                    self.forsys_input[headers.get_priority_header(p)].append(
                        self.pixel_dist_x_to_y_to_condition_to_values[x][y][p]
                    )
