from conditions.models import BaseCondition, Condition
from conditions.raster_utils import (ConditionPixelValues,
                                     compute_condition_stats_from_raster,
                                     get_condition_values_from_raster,
                                     get_raster_geo)
from django.contrib.gis.geos import GEOSGeometry, Polygon
from forsys.forsys_request_params import (
    ForsysGenerationRequestParams, ForsysRankingRequestParams,
    PreForsysClusterType)
from forsys.cluster_stands import ClusteredStands
from forsys.merge_polygons import merge_polygons
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

    # Note: when each stand represents a pixel, conditions and priorities will
    # have the same values; however, when a single stand represents multiple
    # pixels, conditions and priorities will have diffent values.
    # Conditions represent the mean score across all pixels within a stand.
    # This is useful when coloring maps.
    # Priorities represent the sum of scores across all pixels within a stand.
    # This is useful when scoring stands and project areas in Forsys.

    # Header prefixes for conditions and priorities.
    _CONDITION_PREFIX = "c_"  # Only used for generation, not prioritization.
    _PRIORITY_PREFIX = "p_"
    # List of headers for conditions and priorities.
    # Downstream, this must be listed in the same order as constructor input
    # priorities.
    # Only used for generation, not prioritization.
    condition_headers: list[str]
    priority_headers: list[str]

    def __init__(self, priorities: list[str]) -> None:
        self.priority_headers = []

        for p in priorities:
            self.priority_headers.append(self.get_priority_header(p))

    # Returns a priority header givn a priority string.
    def get_priority_header(self, priority: str) -> str:
        return self._PRIORITY_PREFIX + priority

    # Returns a condition hader given a condition string.
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
            # The entire project area is represented by a single stand.
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
                # TODO: adjust the 1 - score logic as we move to AP score.
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


# This is limited to a single scenario.
class ForsysGenerationInput():
    # Treatment cost per kilometer-squared (in USD)
    # TODO: make this variable based on a user input and/or a treatment cost
    # raster.
    TREATMENT_COST_PER_KM_SQUARED = 5000 * 1000 * 1000

    # For condition scores normalized to the range, [-1, 1], maximum priority
    # weight is 2.0. This constant is necessary for normalizing scores when
    # clustering.
    # TODO: adjust this as we move to AP score.
    MAX_PRIORITY_SCORE = 2.0

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

        geo = get_raster_geo(planning_area)

        self._conditions_to_raster_values,  self._topleft_coords = \
            self._fetch_condition_raster_values(geo, priorities, region)
        # This populates self._pixel_dist_x_to_y_to_condition_to_values.
        self._pixel_dist_x_to_y_to_condition_to_values = \
            self._merge_condition_raster_values(
                self._conditions_to_raster_values, self._topleft_coords)
        width, height = self._get_width_and_height(
            self._pixel_dist_x_to_y_to_condition_to_values)

        if params.cluster_type == PreForsysClusterType.NONE:
            self.forsys_input = \
                self._convert_merged_condition_rasters_to_input_df(
                    headers, priorities,
                    self._pixel_dist_x_to_y_to_condition_to_values)
        elif params.cluster_type == PreForsysClusterType.HIERARCHICAL:
            clustered_stands = ClusteredStands(
                self._pixel_dist_x_to_y_to_condition_to_values, width, height,
                self.MAX_PRIORITY_SCORE, params.get_priority_weights_dict(),
                params.pixel_index_weight, params.num_clusters)
            if clustered_stands.cluster_status_message is None:
                self.forsys_input = \
                    self._convert_clustered_merged_condition_rasters_to_input_df(
                        headers, priorities,
                        clustered_stands.clusters_to_stands)
            else:
                self.forsys_input = \
                    self._convert_merged_condition_rasters_to_input_df(
                        headers, priorities)

    # Fetches ConditionPixelValues instances and places them in
    # self._conditions_to_raster_values, a dictionary mapping condition names
    # to the ConditionPixelValues instances.
    def _fetch_condition_raster_values(
            self, geo: GEOSGeometry, priorities: list[str],
            region: str) -> tuple[dict[str, ConditionPixelValues],
                                  tuple[float, float]]:
        base_condition_ids_to_names = _get_base_condition_ids_to_names(
            region, priorities)
        conditions = _get_conditions(base_condition_ids_to_names.keys())

        conditions_to_raster_values = {}
        topleft_coords = None
        for c in conditions:
            # TODO: replace this with select_related.
            name = base_condition_ids_to_names[c.condition_dataset_id]
            values = get_condition_values_from_raster(geo, c.raster_name)
            if values is None:
                raise Exception(
                    "plan has no intersection with condition raster, %s" %
                    name)
            conditions_to_raster_values[name] = values
            topleft_coords = self._get_updated_topleft_coords(
                values, topleft_coords)
        return conditions_to_raster_values, topleft_coords

    # Updates self._topleft_coords if the one represented by
    # condition_pixel_values is further to the top-left corner according to the
    # raster scale.
    def _get_updated_topleft_coords(
            self, condition_pixel_values: ConditionPixelValues,
            topleft_coords: tuple[float, float] | None) -> tuple[float, float]:
        if condition_pixel_values["upper_left_coord_x"] is None:
            raise Exception(
                "fetched poorly-formatted raster pixel data" +
                " - missing upper_left_coord_x")
        if condition_pixel_values["upper_left_coord_y"] is None:
            raise Exception(
                "fetched poorly-formatted raster pixel data" +
                " - missing upper_left_coord_y")
        if topleft_coords is None:
            return (condition_pixel_values["upper_left_coord_x"],
                    condition_pixel_values["upper_left_coord_y"])
        return (self._select_topleft_coord(
            topleft_coords[0],
            condition_pixel_values["upper_left_coord_x"],
            settings.CRS_9822_SCALE[0]),
            self._select_topleft_coord(
            topleft_coords[1],
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
    def _merge_condition_raster_values(
            self,
            conditions_to_raster_values: dict[str, ConditionPixelValues],
            topleft_coords: tuple[float, float]
    ) -> dict[int, dict[int, dict[str, float]]]:
        pixel_dist_x_to_y_to_condition_to_values = {}
        for condition_name in conditions_to_raster_values.keys():
            values = conditions_to_raster_values[condition_name]
            xdiff = self._get_pixel_dist_diff(
                values["upper_left_coord_x"],
                topleft_coords[0],
                settings.CRS_9822_SCALE[0])
            ydiff = self._get_pixel_dist_diff(
                values["upper_left_coord_y"],
                topleft_coords[1],
                settings.CRS_9822_SCALE[1])
            for i in range(len(values["pixel_dist_x"])):
                x = values["pixel_dist_x"][i] + xdiff
                y = values["pixel_dist_y"][i] + ydiff
                # TODO: adjust the 1 - score logic as we move to AP score.
                value = 1 - values["values"][i]
                self._insert_value_in_position_and_condition_dict(
                    x, y, condition_name, value,
                    pixel_dist_x_to_y_to_condition_to_values)
        return self._get_stands_containing_all_condition_scores(
            pixel_dist_x_to_y_to_condition_to_values,
            list(conditions_to_raster_values.keys()))

    # Computes the distance, in pixels, between two coordinates.
    def _get_pixel_dist_diff(
            self, coord: float, origin_coord: float, scale: float) -> int:
        return int((coord - origin_coord) / scale)

    # Copies stands with the complete set of condition scores to an output
    # dictionary. Ignores stands missing the complete set of condition scores.
    def _get_stands_containing_all_condition_scores(
        self,
        x_to_y_to_condition_to_values: dict[int, dict[int, dict[str, float]]],
        conditions: list[str]
    ) -> dict[int, dict[int, dict[str, float]]]:
        output = {}
        for x in x_to_y_to_condition_to_values.keys():
            y_to_condition_to_values = x_to_y_to_condition_to_values[x]
            for y in y_to_condition_to_values.keys():
                conditions_to_values = y_to_condition_to_values[y]
                if len(conditions_to_values.keys()) != len(conditions):
                    continue
                for c in conditions_to_values.keys():
                    self._insert_value_in_position_and_condition_dict(
                        x, y, c, conditions_to_values[c], output)
        return output

    # Inserts a value into the x-to-y-to-condition-to-value dictionary.
    def _insert_value_in_position_and_condition_dict(
            self, x: int, y: int, condition: str, value: float,
            d: dict[int, dict[int, dict[str, float]]]) -> None:
        if x not in d.keys():
            d[x] = {}

        d = d[x]
        if y not in d.keys():
            d[y] = {}

        d = d[y]
        d[condition] = value

    # Returns the width and height of an image represented by parameter,
    # x_to_y_to_condition_to_values.
    def _get_width_and_height(
        self,
        x_to_y_to_condition_to_values: dict[int, dict[int, dict[str, float]]]
    ) -> list[int, int]:
        max_x = 0
        max_y = 0
        for x in x_to_y_to_condition_to_values.keys():
            y_to_condition_to_values = x_to_y_to_condition_to_values[x]
            max_x = max(max_x, x)
            for y in y_to_condition_to_values.keys():
                max_y = max(max_y, y)
        return [max_x, max_y]

    # Converts self._pixel_dist_x_to_y_to_condition_to_values into forsys input
    # dataframe data.
    def _convert_merged_condition_rasters_to_input_df(
        self, headers: ForsysInputHeaders,
        priorities: list[str],
        x_to_y_to_conditions_to_values: dict[int,
                                             dict[int, dict[str, float]]]
    ) -> dict[str, list]:
        forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities)
        # Stand geometries are not necessary for a ranking input dataframe, but
        # they are necessary for a generation input dataframe.
        forsys_input[headers.FORSYS_GEO_WKT_HEADER] = []

        DUMMY_PROJECT_ID = 0
        stand_id = 0
        for x in x_to_y_to_conditions_to_values.keys():
            y_to_conditions_to_values = x_to_y_to_conditions_to_values[x]
            for y in y_to_conditions_to_values.keys():
                conditions_to_values = y_to_conditions_to_values[y]
                forsys_input[headers.FORSYS_STAND_ID_HEADER].append(stand_id)
                forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(
                    DUMMY_PROJECT_ID)
                forsys_input[headers.FORSYS_AREA_HEADER].append(
                    settings.RASTER_PIXEL_AREA)
                forsys_input[headers.FORSYS_COST_HEADER].append(
                    settings.RASTER_PIXEL_AREA * self.TREATMENT_COST_PER_KM_SQUARED)
                forsys_input[headers.FORSYS_GEO_WKT_HEADER].append(
                    self._get_raster_pixel_geo(x, y).wkt)
                for p in conditions_to_values.keys():
                    forsys_input[headers.get_priority_header(
                        p)].append(conditions_to_values[p])
                stand_id = stand_id + 1
        return forsys_input

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

    def _convert_clustered_merged_condition_rasters_to_input_df(
        self, headers: ForsysInputHeaders,
        priorities: list[str],
        clusters_to_stands: dict[int, tuple[int, int]],
        x_to_y_to_conditions_to_values: dict[int,
                                             dict[int, dict[str, float]]]
    ) -> dict[str, list]:
        forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities)
        # Stand geometries are not necessary for a ranking input dataframe, but
        # they are necessary for a generation input dataframe.
        forsys_input[headers.FORSYS_GEO_WKT_HEADER] = []
        # Because of clustering, condition scores (aka mean) and priority
        # scores (aka sum) are not the same. Thus, they need to be included
        # separately for visualization purposes.
        for p in priorities:
            forsys_input[headers.get_condition_header(p)] = []

        DUMMY_PROJECT_ID = 0
        for cluster_id in clusters_to_stands.keys():
            # python libraries may cause cluster_id to be np.int64 type, which
            # isn't compatible with downstream json operations.
            cluster_id = int(cluster_id)

            stands = clusters_to_stands[cluster_id]
            num_stands = len(stands)

            geos = []
            priority_scores = {}
            for stand_pixel_pos in stands:
                x = stand_pixel_pos[0]
                y = stand_pixel_pos[1]
                geos.append(self._get_raster_pixel_geo(x, y))
                conditions_to_values = x_to_y_to_conditions_to_values[x][y]
                for p in conditions_to_values.keys():
                    priority_header = headers.get_priority_header(p)
                    priority_score = conditions_to_values[p]
                    if priority_header in priority_scores:
                        priority_scores[priority_header] = \
                            priority_scores[priority_header] + priority_score
                    else:
                        priority_scores[priority_header] = priority_score
            for p in conditions_to_values.keys():
                condition_header = headers.get_condition_header(p)
                priority_scores[condition_header] = \
                    priority_scores[priority_header] / num_stands

            forsys_input[headers.FORSYS_STAND_ID_HEADER].append(cluster_id)
            forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(
                DUMMY_PROJECT_ID)
            forsys_input[headers.FORSYS_AREA_HEADER].append(
                settings.RASTER_PIXEL_AREA * num_stands)
            forsys_input[headers.FORSYS_COST_HEADER].append(
                settings.RASTER_PIXEL_AREA *
                self.TREATMENT_COST_PER_KM_SQUARED * num_stands)

            forsys_input[headers.FORSYS_GEO_WKT_HEADER].append(
                merge_polygons(geos, 0).wkt)
            for p in priority_scores.keys():
                forsys_input[p].append(priority_scores[p])
        return forsys_input
