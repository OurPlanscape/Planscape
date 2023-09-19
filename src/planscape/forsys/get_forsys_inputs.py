from conditions.raster_utils import compute_condition_stats_from_raster, get_raster_geo
from django.contrib.gis.geos import Polygon
from forsys.cluster_stands import ClusteredStands
from forsys.forsys_request_params import (
    ClusterAlgorithmType,
    ForsysGenerationRequestParams,
    ForsysRankingRequestParams,
    StandEligibilityParams,
)
from forsys.merge_polygons import merge_polygons
from forsys.raster_condition_fetcher import RasterConditionFetcher, get_conditions
from forsys.raster_condition_treatment_eligibility_selector import (
    RasterConditionTreatmentEligibilitySelector,
)
from planscape import settings


# Forsys input dataframe headers.
class ForsysInputHeaders:
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
    # Column values are expected to be 0 (ineligible for treatment) or 1
    # (eligible for treatment).
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
    # Both are necessary when Patchmax processes stands of differing acreages.

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
    headers: ForsysInputHeaders, priorities: list[str]
) -> dict[str, list]:
    forsys_input = {}
    forsys_input[headers.FORSYS_PROJECT_ID_HEADER] = []
    forsys_input[headers.FORSYS_STAND_ID_HEADER] = []
    forsys_input[headers.FORSYS_AREA_HEADER] = []
    forsys_input[headers.FORSYS_COST_HEADER] = []
    for p in priorities:
        forsys_input[headers.get_priority_header(p)] = []
    return forsys_input


class ForsysRankingInput:
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
        self, params: ForsysRankingRequestParams, headers: ForsysInputHeaders
    ) -> None:
        region = params.region
        priorities = params.priorities
        project_areas = params.project_areas

        conditions = get_conditions(region, priorities)

        self.forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities
        )

        for proj_id in project_areas.keys():
            geo = get_raster_geo(project_areas[proj_id])

            self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(proj_id)
            # The entire project area is represented by a single stand.
            self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(proj_id)

            num_pixels = 0  # number of non-NaN raster pixels captured by geo.
            for c in conditions:
                name = c.condition_dataset.condition_name
                stats = compute_condition_stats_from_raster(geo, c.raster_name)
                if stats["count"] == 0:
                    raise Exception("no score was retrieved for condition, %s" % name)
                # TODO: adjust the 1 - score logic as we move to AP score.
                self.forsys_input[headers.get_priority_header(name)].append(
                    stats["count"] - stats["sum"]
                )

                # The number of non-NaN pixels captured by geo may vary between
                # condition rasters because some rasters have large undefined
                # patches. Taking the maximum count across all conditions
                # should account for the more egregious cases of undefined
                # patches.
                num_pixels = max(stats["count"], num_pixels)

            area = num_pixels * settings.RASTER_PIXEL_AREA
            self.forsys_input[headers.FORSYS_AREA_HEADER].append(area)
            self.forsys_input[headers.FORSYS_COST_HEADER].append(
                area * self.TREATMENT_COST_PER_KM_SQUARED
            )


# This is limited to a single scenario.
class ForsysGenerationInput:
    # Treatment cost per kilometer-squared (in USD)
    # TODO: make this variable based on a user input and/or a treatment cost
    # raster.
    TREATMENT_COST_PER_KM_SQUARED = 5000 * 1000 * 1000

    # Keys that represent buildings, road proximity, and slope in
    # RasterConditionFetcher data structures.
    BUILDINGS_KEY = "buildings"
    ROAD_PROXIMITY_KEY = "road_proximity"
    SLOPE_KEY = "slope"

    # A dictionary representing a forsys input dataframe.
    # In the dataframe, headers correspond to ForsysInputHeaders headers. Each
    # row represents a unique stand.
    # Dictionary keys are dataframe headers. Dictionary values are lists
    # corresponding to columns below each dataframe header.
    forsys_input: dict[str, list]

    # ----- Intermediate data -----
    # This fetches raw raster data and merges/reformats it.
    _condition_fetcher: RasterConditionFetcher
    # Given the merged pixel data in _condition_fetcher, this identifies a list
    # of pixels to treat and a list of pixels to pass through.
    _treatment_eligibility_selector: RasterConditionTreatmentEligibilitySelector

    def __init__(
        self, params: ForsysGenerationRequestParams, headers: ForsysInputHeaders
    ) -> None:
        region = params.region
        priorities = params.priorities
        planning_area = params.planning_area

        geo = get_raster_geo(planning_area)

        self._condition_fetcher = RasterConditionFetcher(
            region,
            priorities,
            self._get_attributes_to_retrieve(params.stand_eligibility_params),
            geo,
        )

        self._treatment_eligibility_selector = (
            RasterConditionTreatmentEligibilitySelector(
                self._condition_fetcher.data,
                priorities,
                params.stand_eligibility_params,
                self.BUILDINGS_KEY,
                self.ROAD_PROXIMITY_KEY,
                self.SLOPE_KEY,
            )
        )

        self.forsys_input = self._initialize_headers(headers, priorities)
        next_stand_id = 0
        included_clustered_stands = False
        if (
            params.cluster_params.cluster_algorithm_type
            == ClusterAlgorithmType.HIERARCHICAL_IN_PYTHON
        ):
            # TODO: instead of calling get_values_eligible_for_treatment,
            # change ClusteredStands to process RasterConditionFetcher data.
            clustered_stands = ClusteredStands(
                self.get_values_eligible_for_treatment(priorities),
                self._condition_fetcher.width,
                self._condition_fetcher.height,
                params.get_priority_weights_dict(),
                params.cluster_params.pixel_index_weight,
                params.cluster_params.num_clusters,
            )
            if clustered_stands.cluster_status_message is None:
                next_stand_id = self._append_clustered_stands_to_treat_to_input_df(
                    headers,
                    priorities,
                    clustered_stands.clusters_to_stands,
                    self._condition_fetcher,
                    self.forsys_input,
                    next_stand_id,
                )
                included_clustered_stands = True

        if not included_clustered_stands:
            next_stand_id = self._append_stands_to_treat_to_input_df(
                headers,
                priorities,
                self._condition_fetcher,
                self._treatment_eligibility_selector.pixels_to_treat,
                self.forsys_input,
                next_stand_id,
            )

        self._append_stands_to_pass_to_input_df(
            headers,
            priorities,
            self._condition_fetcher,
            self._treatment_eligibility_selector.pixels_to_pass_through,
            self.forsys_input,
            next_stand_id,
        )

    def _get_attributes_to_retrieve(self, params: StandEligibilityParams) -> list[str]:
        attributes = []
        if params.filter_by_buildings:
            attributes.append(self.BUILDINGS_KEY)
        if params.filter_by_road_proximity:
            attributes.append(self.ROAD_PROXIMITY_KEY)
        if params.filter_by_slope:
            attributes.append(self.SLOPE_KEY)
        return attributes

    def _initialize_headers(
        self, headers: ForsysInputHeaders, priorities: list[str]
    ) -> dict[str, list]:
        forsys_input = _get_initialized_forsys_input_with_common_headers(
            headers, priorities
        )
        # Stand geometries are not necessary for a ranking input dataframe, but
        # they are necessary for a generation input dataframe.
        forsys_input[headers.FORSYS_GEO_WKT_HEADER] = []
        # Because of clustering, condition scores (aka mean) and priority
        # scores (aka sum) are not the same. Thus, they need to be included
        # separately.
        for p in priorities:
            forsys_input[headers.get_condition_header(p)] = []
        # Whether a stand is eligible for treatment is only reelevant for a
        # generation input dataframe.
        forsys_input[headers.FORSYS_TREATMENT_ELIGIBILITY_HEADER] = []
        return forsys_input

    # Appends stands to treat to the forsys input dataframe.
    # The first stand to be appended will have stand ID, starting_stand_id, and
    # the one following will have starting_stand_id + 1.
    # Returns the next available integer that can be used as a stand ID.
    def _append_stands_to_treat_to_input_df(
        self,
        headers: ForsysInputHeaders,
        priorities: list[str],
        raster_conditions: RasterConditionFetcher,
        pixels: dict[int, dict[int, int]],
        forsys_input: dict[str, list],
        starting_stand_id: int,
    ) -> int:
        DUMMY_PROJECT_ID = 0
        stand_id = starting_stand_id
        for x in pixels.keys():
            for y in pixels[x].keys():
                i = pixels[x][y]
                priority_scores = {}
                for p in priorities:
                    priority_scores[
                        headers.get_priority_header(p)
                    ] = raster_conditions.data[p][i]
                    priority_scores[
                        headers.get_condition_header(p)
                    ] = raster_conditions.data[p][i]
                pixel_geo = self._get_raster_pixel_geo(
                    x, y, raster_conditions.topleft_coords
                )
                self._append_single_stand_to_forsys_input_df(
                    headers,
                    forsys_input,
                    priority_scores,
                    DUMMY_PROJECT_ID,
                    stand_id,
                    settings.RASTER_PIXEL_AREA,
                    settings.RASTER_PIXEL_AREA * self.TREATMENT_COST_PER_KM_SQUARED,
                    pixel_geo.wkt,
                    True,
                )
                stand_id = stand_id + 1
        return stand_id

    # Appends stands to pass (i.e. stands ineligible for treatment that can
    # still be included sin project areas) to the forsys input dataframe.
    # The first stand to be appended will have stand ID, starting_stand_id, and
    # the one following will have starting_stand_id + 1.
    # Returns the next available integer that can be used as a stand ID.
    # Of note: if a stand is to be passed, its priority and condition scores
    # are set to 0.
    def _append_stands_to_pass_to_input_df(
        self,
        headers: ForsysInputHeaders,
        priorities: list[str],
        raster_conditions: RasterConditionFetcher,
        pixels: dict[int, dict[int, int]],
        forsys_input: dict[str, list],
        starting_stand_id: int,
    ) -> int:
        DUMMY_PROJECT_ID = 0
        stand_id = starting_stand_id
        for x in pixels.keys():
            for y in pixels[x].keys():
                priority_scores = {}
                for p in priorities:
                    priority_scores[headers.get_priority_header(p)] = 0
                    priority_scores[headers.get_condition_header(p)] = 0
                pixel_geo = self._get_raster_pixel_geo(
                    x, y, raster_conditions.topleft_coords
                )
                self._append_single_stand_to_forsys_input_df(
                    headers,
                    forsys_input,
                    priority_scores,
                    DUMMY_PROJECT_ID,
                    stand_id,
                    settings.RASTER_PIXEL_AREA,
                    settings.RASTER_PIXEL_AREA * self.TREATMENT_COST_PER_KM_SQUARED,
                    pixel_geo.wkt,
                    False,
                )
                stand_id = stand_id + 1
        return stand_id

    # Appends stands to treat to the forsys input dataframe.
    # In this version, a stand is actually a cluster of pixels, and stands may
    # have different acreages.
    # The first stand to be appended will have stand ID, starting_stand_id, and
    # the one following will have starting_stand_id + 1.
    # Returns the next available integer that can be used as a stand ID.
    # Of note: a stand's condition score is the mean of each pixel's impact
    # score. A stand's priority score is the sum of each pixel's imppact score.
    def _append_clustered_stands_to_treat_to_input_df(
        self,
        headers: ForsysInputHeaders,
        priorities: list[str],
        clusters_to_stands: dict[int, tuple[int, int]],
        raster_conditions: RasterConditionFetcher,
        forsys_input: dict[str, list],
        starting_stand_id: int,
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
                if x not in raster_conditions.x_to_y_to_index.keys():
                    raise Exception("raster condition data missing x-pixel, %d" % x)
                if y not in raster_conditions.x_to_y_to_index[x].keys():
                    raise Exception(
                        "raster condition data missing x-pixel/y-pixel "
                        + "pair, (%d, %d)" % (x, y)
                    )
                i = raster_conditions.x_to_y_to_index[x][y]

                geos.append(
                    self._get_raster_pixel_geo(x, y, raster_conditions.topleft_coords)
                )

                for p in priorities:
                    priority_header = headers.get_priority_header(p)
                    priority_score = raster_conditions.data[p][i]
                    if priority_header in priority_scores.keys():
                        priority_scores[priority_header] = (
                            priority_scores[priority_header] + priority_score
                        )
                    else:
                        priority_scores[priority_header] = priority_score

            for p in priorities:
                condition_header = headers.get_condition_header(p)
                priority_scores[condition_header] = (
                    priority_scores[priority_header] / num_stands
                )
            self._append_single_stand_to_forsys_input_df(
                headers,
                forsys_input,
                priority_scores,
                DUMMY_PROJECT_ID,
                stand_id,
                settings.RASTER_PIXEL_AREA * num_stands,
                settings.RASTER_PIXEL_AREA
                * self.TREATMENT_COST_PER_KM_SQUARED
                * num_stands,
                merge_polygons(geos, 0).wkt,
                True,
            )
            stand_id = stand_id + 1
        return stand_id

    # Returns a Polygon representing the raster pixel at pixel position,
    # (x, y).
    def _get_raster_pixel_geo(
        self, x: int, y: int, topleft_coords: tuple[float, float]
    ) -> Polygon:
        xmin = topleft_coords[0] + settings.CRS_9822_SCALE[0] * x
        xmax = xmin + settings.CRS_9822_SCALE[0]
        ymin = topleft_coords[1] + settings.CRS_9822_SCALE[1] * y
        ymax = ymin + settings.CRS_9822_SCALE[1]
        geo = Polygon(
            ((xmin, ymin), (xmin, ymax), (xmax, ymax), (xmax, ymin), (xmin, ymin))
        )
        geo.srid = settings.CRS_FOR_RASTERS
        return geo

    # Adds a new entry to the Forsys input dataframe dictionary.
    def _append_single_stand_to_forsys_input_df(
        self,
        headers: ForsysInputHeaders,
        forsys_input: dict[str, list],
        conditions_and_priorities: dict[str, float],
        project_id: int,
        stand_id: int,
        area: float,
        cost: float,
        geo_wkt: str,
        is_eligible_for_treatment: bool,
    ) -> None:
        forsys_input[headers.FORSYS_STAND_ID_HEADER].append(stand_id)
        forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(project_id)
        forsys_input[headers.FORSYS_AREA_HEADER].append(area)
        forsys_input[headers.FORSYS_COST_HEADER].append(cost)
        forsys_input[headers.FORSYS_GEO_WKT_HEADER].append(geo_wkt)
        forsys_input[headers.FORSYS_TREATMENT_ELIGIBILITY_HEADER].append(
            1.0 if is_eligible_for_treatment else 0.0
        )
        for k in conditions_and_priorities.keys():
            forsys_input[k].append(conditions_and_priorities[k])

    # A temporary method until ClusteredStands is modified to accept different
    # input types. This returns a dictionary mapping x-pixel to y-pixel to
    # condition name to condition impact score.
    def get_values_eligible_for_treatment(self, priorities: list[str]):
        output = {}
        for x in self._treatment_eligibility_selector.pixels_to_treat.keys():
            if x not in self._condition_fetcher.x_to_y_to_index.keys():
                raise Exception("x_to_y_to_index missing x-pixel, %d" % x)
            if x not in output.keys():
                output[x] = {}
            for y in self._treatment_eligibility_selector.pixels_to_treat[x]:
                if y not in self._condition_fetcher.x_to_y_to_index[x].keys():
                    raise Exception(
                        "x_to_y_to_indexmissing x-pixel/y-pixel pair, (%d, %d)" % (x, y)
                    )
                i = self._condition_fetcher.x_to_y_to_index[x][y]
                if y not in output[x].keys():
                    output[x][y] = {}
                for p in priorities:
                    output[x][y][p] = self._condition_fetcher.data[p][i]
        return output
