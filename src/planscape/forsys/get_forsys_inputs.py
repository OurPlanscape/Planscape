from conditions.raster_utils import (compute_condition_stats_from_raster,
                                     get_raster_geo)
from django.contrib.gis.geos import Polygon
from forsys.cluster_stands import ClusteredStands
from forsys.forsys_request_params import (ClusterAlgorithmType,
                                          ForsysGenerationRequestParams,
                                          ForsysRankingRequestParams)
from forsys.merge_polygons import merge_polygons
from forsys.raster_condition_fetcher import (RasterConditionFetcher,
                                             get_conditions)
from forsys.raster_condition_treatment_eligibility_selector import (
    RasterConditionTreatmentEligibilitySelector)
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
    # Constant header for whether a stand is eligible for treatment.
    # Only used for generation, not prioritization.
    # 0: not eligible
    # 1: eligible
    # This corresponds to Forsys input parameter, stand_threshold (not
    # global_theshold). When a stand fails the stand_threshold, it can still be
    # included in project areas, but is not eligible for treatment (in
    # contrast, when a stand fails the global_threshold, it cannot be included
    # in project areas).
    FORSYS_TREATMENT_ELIGIBILITY_HEADER = "eligible"

    # Note: when a stand contains a single pixel, conditions and priorities
    # will have the same values; however, when a stand can contain multiple
    # pixels, conditions and priorities will have diffent values.
    # Conditions represent the mean score across all pixels within a stand.
    # Priorities represent the sum of scores across all pixels within a stand.
    # Both are necessary when Patchmax processes stands of differing sizes.

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
        self.condition_headers = []

        for p in priorities:
            self.priority_headers.append(self.get_priority_header(p))
            self.condition_headers.append(self.get_condition_header(p))

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

        conditions = get_conditions(region, priorities)

        self.forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities)

        for proj_id in project_areas.keys():
            geo = get_raster_geo(project_areas[proj_id])

            self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(proj_id)
            # The entire project area is represented by a single stand.
            self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(proj_id)

            num_pixels = 0  # number of non-NaN raster pixels captured by geo.
            for c in conditions:
                name = c.base_condition.condition_name
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

    # A dictionary representing a forsys input dataframe.
    # In the dataframe, headers correspond to ForsysInputHeaders headers. Each
    # row represents a unique stand.
    # Dictionary keys are dataframe headers. Dictionary values are lists
    # corresponding to columns below each dataframe header.
    forsys_input: dict[str, list]

    # ----- Intermediate data -----
    # This fetches raw raster data.
    # It contains raw raster data and the topleft coordinate.
    _condition_fetcher: RasterConditionFetcher
    # This reformats raw raster data into a dictionary mapping x pixel position
    # to y pixel position to condition names to condition values and identifies
    # the pixels eligible for treatment.
    # It contains width, height, x_to_y_to_condition_to_values,
    # pixels_to_treat, and pixels_to_pass_through.
    _treatment_eligibility_selector: RasterConditionTreatmentEligibilitySelector

    def __init__(
            self, params: ForsysGenerationRequestParams,
            headers: ForsysInputHeaders) -> None:
        region = params.region
        priorities = params.priorities
        planning_area = params.planning_area

        geo = get_raster_geo(planning_area)

        self._condition_fetcher = RasterConditionFetcher(
            region, priorities, geo)

        self._treatment_eligibility_selector = \
            RasterConditionTreatmentEligibilitySelector(
                self._condition_fetcher.conditions_to_raster_values,
                self._condition_fetcher.topleft_coords, priorities, geo)

        self.forsys_input = self._initialize_headers(headers, priorities)
        next_stand_id = 0
        included_clustered_stands = False
        if params.cluster_params.cluster_algorithm_type == \
                ClusterAlgorithmType.HIERARCHICAL_IN_PYTHON:
            clustered_stands = ClusteredStands(
                self._treatment_eligibility_selector.get_values_eligible_for_treatment(),
                self._treatment_eligibility_selector.width,
                self._treatment_eligibility_selector.height,
                params.get_priority_weights_dict(),
                params.cluster_params.pixel_index_weight,
                params.cluster_params.num_clusters)
            if clustered_stands.cluster_status_message is None:
                next_stand_id = \
                    self._append_clustered_stands_to_treat_to_input_df(
                        headers, priorities,
                        clustered_stands.clusters_to_stands,
                        self._condition_fetcher.topleft_coords,
                        self._treatment_eligibility_selector,
                        self.forsys_input, next_stand_id)
                included_clustered_stands = True

        if not included_clustered_stands:
            next_stand_id = self._append_stands_to_treat_to_input_df(
                headers, priorities, self._condition_fetcher.topleft_coords,
                self._treatment_eligibility_selector, self.forsys_input, next_stand_id)

        self._append_pixels_to_pass(
            headers, priorities, self._condition_fetcher.topleft_coords,
            self._treatment_eligibility_selector, self.forsys_input, next_stand_id)

    def _initialize_headers(self, headers: ForsysInputHeaders,
                            priorities: list[str]) -> dict[str, list]:
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
        # Whether a stand is eligible for treatment is only reelevant for a generation input dataframe.
        forsys_input[headers.FORSYS_TREATMENT_ELIGIBILITY_HEADER] = []
        return forsys_input

    # Adds pixels that are eligible for treatment to the Forsys input 
    # dataframe dictionary.
    def _append_stands_to_treat_to_input_df(
        self, headers: ForsysInputHeaders,
        priorities: list[str],
        topleft_coords: tuple[float, float],
        treatment_eligibility_selector: RasterConditionTreatmentEligibilitySelector,
        forsys_input: dict[str, list],
        starting_stand_id: int
    ) -> int:
        DUMMY_PROJECT_ID = 0
        stand_id = starting_stand_id
        for x in treatment_eligibility_selector.pixels_to_treat.keys():
            for y in treatment_eligibility_selector.pixels_to_treat[x]:
                conditions_to_values = treatment_eligibility_selector.x_to_y_to_condition_to_values[
                    x][y]
                priority_scores = {}
                for p in priorities:
                    priority_scores[headers.get_priority_header(
                        p)] = conditions_to_values[p]
                    priority_scores[headers.get_condition_header(
                        p)] = conditions_to_values[p]
                self._append_to_forsys_input_df(
                    headers, forsys_input, priority_scores, DUMMY_PROJECT_ID,
                    stand_id, settings.RASTER_PIXEL_AREA,
                    settings.RASTER_PIXEL_AREA *
                    self.TREATMENT_COST_PER_KM_SQUARED,
                    self._get_raster_pixel_geo(x, y, topleft_coords).wkt, True)
                stand_id = stand_id + 1
        return stand_id

    # Adds clusters representing groups of pixels that are eligible for 
    # treatment to the Forsys input dataframe.
    def _append_clustered_stands_to_treat_to_input_df(
        self, headers: ForsysInputHeaders,
        priorities: list[str],
        clusters_to_stands: dict[int, tuple[int, int]],
        topleft_coords: tuple[float, float],
        treatment_eligibility_selector: RasterConditionTreatmentEligibilitySelector,
        forsys_input: dict[str, list], starting_stand_id: int
    ) -> int:
        stand_id = starting_stand_id
        DUMMY_PROJECT_ID = 0
        for cluster_id in clusters_to_stands.keys():
            stands = clusters_to_stands[cluster_id]
            num_stands = len(stands)

            geos = []
            priority_scores = {}
            for stand_pixel_pos in stands:
                x = stand_pixel_pos[0]
                y = stand_pixel_pos[1]
                geos.append(self._get_raster_pixel_geo(x, y, topleft_coords))
                conditions_to_values = \
                    treatment_eligibility_selector.x_to_y_to_condition_to_values[x][y]
                for p in priorities:
                    priority_header = headers.get_priority_header(p)
                    priority_score = conditions_to_values[p]
                    if priority_header in priority_scores:
                        priority_scores[priority_header] = \
                            priority_scores[priority_header] + priority_score
                    else:
                        priority_scores[priority_header] = priority_score

            for p in priorities:
                condition_header = headers.get_condition_header(p)
                priority_scores[condition_header] = \
                    priority_scores[priority_header] / num_stands
            self._append_to_forsys_input_df(
                headers, forsys_input, priority_scores, DUMMY_PROJECT_ID,
                stand_id, settings.RASTER_PIXEL_AREA * num_stands, settings.
                RASTER_PIXEL_AREA * self.TREATMENT_COST_PER_KM_SQUARED *
                num_stands, merge_polygons(geos, 0).wkt, True)
            stand_id = stand_id + 1
        return stand_id

    # Adds pixels that are ineligible for treatment (i.e. the ones that will be 
    # penalized by EPW) to the Forsys input dataframe.
    def _append_pixels_to_pass(
            self, headers: ForsysInputHeaders, priorities: list[str],
            topleft_coords: tuple[float, float],
            treatment_eligibility_selector:
            RasterConditionTreatmentEligibilitySelector,
            forsys_input: dict[str, list],
            starting_stand_id: int):
        DUMMY_PROJECT_ID = 0
        stand_id = starting_stand_id
        default_priority_scores = {}
        for p in priorities:
            default_priority_scores[headers.get_priority_header(p)] = 0
            default_priority_scores[headers.get_condition_header(p)] = 0

        for x in treatment_eligibility_selector.pixels_to_pass_through.keys():
            for y in treatment_eligibility_selector.pixels_to_pass_through[x]:
                self._append_to_forsys_input_df(
                    headers, forsys_input, default_priority_scores, DUMMY_PROJECT_ID,
                    stand_id, settings.RASTER_PIXEL_AREA,
                    settings.RASTER_PIXEL_AREA *
                    self.TREATMENT_COST_PER_KM_SQUARED,
                    self._get_raster_pixel_geo(x, y, topleft_coords).wkt, False)
                stand_id = stand_id + 1

    # Returns a Polygon representing the raster pixel at pixel position,
    # (x, y).
    def _get_raster_pixel_geo(self, x: int, y: int,
                              topleft_coords: tuple[float, float]) -> Polygon:
        xmin = topleft_coords[0] + settings.CRS_9822_SCALE[0] * x
        xmax = xmin + settings.CRS_9822_SCALE[0]
        ymin = topleft_coords[1] + settings.CRS_9822_SCALE[1] * y
        ymax = ymin + settings.CRS_9822_SCALE[1]
        geo = Polygon(((xmin, ymin),
                       (xmin, ymax),
                       (xmax, ymax),
                       (xmax, ymin),
                       (xmin, ymin)))
        geo.srid = settings.CRS_FOR_RASTERS
        return geo

    # Adds a new entry to the Forsys input dataframe dictionary.
    def _append_to_forsys_input_df(
            self, headers: ForsysInputHeaders, forsys_input: dict[str, list],
            conditions_and_priorities: dict[str, float],
            project_id: int, stand_id: int, area: float, cost: float,
            geo_wkt: str, is_eligible_for_treatment: bool) -> None:
        forsys_input[headers.FORSYS_STAND_ID_HEADER].append(stand_id)
        forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(project_id)
        forsys_input[headers.FORSYS_AREA_HEADER].append(area)
        forsys_input[headers.FORSYS_COST_HEADER].append(cost)
        forsys_input[headers.FORSYS_GEO_WKT_HEADER].append(geo_wkt)
        forsys_input[headers.FORSYS_TREATMENT_ELIGIBILITY_HEADER].append(
            1.0 if is_eligible_for_treatment else 0.0)
        for k in conditions_and_priorities.keys():
            forsys_input[k].append(conditions_and_priorities[k])
