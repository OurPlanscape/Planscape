import numpy as np

from forsys.forsys_request_params import StandEligibilityParams


# Identifies ...
# 1) pixels that are eligible for treatment and
# 2) pixels that are ineligible for treatment but may be included in project
# areas.
class RasterConditionTreatmentEligibilitySelector:
    # Pixels that are eligible for treatment, keyed by x-pixel, then y-pixel.
    # The value is the index representing the pixel in the input dataframe.
    pixels_to_treat: dict[int, dict[int, int]]
    # Pixels that are ineligible for treatment (but may be included in project
    # areas), keyed by x-pixel, then y-pixel.
    # The value is the index representing the pixel in the input dataframe.
    pixels_to_pass_through: dict[int, dict[int, int]]

    # Input parameter, data, is expected to be one of the outputs of class,
    # RasterConditionFetcher. Each row represents a pixel, and each column
    # represents a specific feature. Column headers include:
    #   - x: the x-pixel index
    #   - y: the y-pixel index
    #   - <priority name>: each priority has its own column. If a priority
    #       value exists for a given pixel, the element corresponding to the
    #       pixel is a float; otherwise, it's np.nan.
    def __init__(
        self,
        data: dict[str, list],
        priorities: list[str],
        stand_eligibility_params: StandEligibilityParams,
        buildings_key: str,
        road_proximity_key: str,
        slope_key: str,
    ):
        self._validate_inputs(
            data,
            priorities,
            stand_eligibility_params,
            buildings_key,
            road_proximity_key,
            slope_key,
        )

        (
            self.pixels_to_treat,
            self.pixels_to_pass_through,
        ) = self._get_pixels_to_treat_and_pass_through(
            data,
            priorities,
            stand_eligibility_params,
            buildings_key,
            road_proximity_key,
            slope_key,
        )

    # Double-checks that the input data is a valid dataframe and contains all
    # the listed priorities.
    def _validate_inputs(
        self,
        data: dict[str, list],
        priorities: list[str],
        stand_eligibility_params: StandEligibilityParams,
        buildings_key: str,
        road_proximity_key: str,
        slope_key: str,
    ):
        if "x" not in data.keys():
            raise Exception("data missing key, x")
        if "y" not in data.keys():
            raise Exception("data missing key, y")
        if len(data["x"]) != len(data["y"]):
            raise Exception("data column lengths are unequal for keys, x and y")
        for p in priorities:
            if p not in data.keys():
                raise Exception("data missing input priority, %s" % (p))
            if len(data[p]) != len(data["x"]):
                raise Exception(
                    "data column lengths are unequal for keys, x and %s" % (p)
                )
        if stand_eligibility_params.filter_by_buildings:
            self._validate_attribute(data, buildings_key)
        if stand_eligibility_params.filter_by_road_proximity:
            self._validate_attribute(data, road_proximity_key)
        if stand_eligibility_params.filter_by_slope:
            self._validate_attribute(data, slope_key)

    def _validate_attribute(self, data: dict[str, list], attribute: str):
        if attribute not in data.keys():
            raise Exception("data missing input attribute, %s" % attribute)
        if len(data[attribute]) != len(data["x"]):
            raise Exception(
                "data column lengths are unequal for keys, x and %s" % attribute
            )

    # Returns two dictionaries mapping each x-pixels to y-pixels to input
    # dataframe row index.
    # They capture the list of pixels to treat, and the list of pixels to pass
    # through via Patchmax's stand_threshold parameter.
    def _get_pixels_to_treat_and_pass_through(
        self,
        data: dict[str, list],
        priorities: list[str],
        stand_eligibility_params: StandEligibilityParams,
        buildings_key: str,
        road_proximity_key: str,
        slope_key: str,
    ) -> tuple[dict[int, dict[int, int]], dict[int, dict[int, int]]]:
        pixels_to_treat = {}
        pixels_to_pass_through = {}
        for i in range(len(data["x"])):
            x = data["x"][i]
            y = data["y"][i]
            if self._is_too_far_from_road(
                data, stand_eligibility_params, road_proximity_key, i
            ):
                continue

            if self._is_eligible(
                data,
                priorities,
                stand_eligibility_params,
                buildings_key,
                road_proximity_key,
                slope_key,
                i,
            ):
                self._insert_value_in_position_dict(x, y, i, pixels_to_treat)
            else:
                self._insert_value_in_position_dict(x, y, i, pixels_to_pass_through)

        return pixels_to_treat, pixels_to_pass_through

    # Returns true if filter_by_road_proximity is true and the stand at index i
    # is too far away from the road or is missing road data.
    def _is_too_far_from_road(
        self,
        data: dict[str, list],
        stand_eligibility_params: StandEligibilityParams,
        road_proximity_key: str,
        i: int,
    ) -> bool:
        if not stand_eligibility_params.filter_by_road_proximity:
            return False
        if road_proximity_key not in data.keys():
            return True
        v = data[road_proximity_key][i]
        if not (isinstance(v, float) or isinstance(v, int)):
            return True
        return v > stand_eligibility_params.max_distance_from_road_in_meters

    # Returns true if a stand is eligible for treatment (i.e. all condition
    # scores are present, and it isn't a building or road, and its slope isn't
    # too high)
    def _is_eligible(
        self,
        data: dict[str, list],
        priorities: list[str],
        stand_eligibility_params: StandEligibilityParams,
        buildings_key: str,
        road_proximity_key: str,
        slope_key: str,
        i: int,
    ) -> bool:
        if not self._all_condition_scores_are_present(data, priorities, i):
            return False
        if self._is_building(data, stand_eligibility_params, buildings_key, i):
            return False
        if self._is_road(data, stand_eligibility_params, road_proximity_key, i):
            return False
        return not self._has_high_slope(data, stand_eligibility_params, slope_key, i)

    # Returns true if all condition impact scores are present in the condition
    # impact score data frame for the stand at index, i (i.e. none of them are
    # NaN).
    def _all_condition_scores_are_present(
        self, data: dict[str, list], priorities: list[str], i: int
    ) -> bool:
        for p in priorities:
            if np.isnan(data[p][i]):
                return False
        return True

    # Returns true if filter_by_buildings is enabled and the stand at index i
    # is a building or missing building data.
    def _is_building(
        self,
        data: dict[str, list],
        stand_eligibility_params: StandEligibilityParams,
        buildings_key: str,
        i: int,
    ) -> bool:
        if not stand_eligibility_params.filter_by_buildings:
            return False
        if buildings_key not in data.keys():
            return True
        v = data[buildings_key][i]
        if not (isinstance(v, bool) or isinstance(v, int) or isinstance(v, float)):
            return True
        return v > 0

    # Returns true if filter_by_buildings is enabled and the stand at index i
    # is a road (i.e. is 0 meters away from a road) or is missing building data.
    def _is_road(
        self,
        data: dict[str, list],
        stand_eligibility_params: StandEligibilityParams,
        road_proximity_key: str,
        i: int,
    ) -> bool:
        if not stand_eligibility_params.filter_by_road_proximity:
            return False
        if road_proximity_key not in data.keys():
            return True
        v = data[road_proximity_key][i]
        if not (isinstance(v, float) or isinstance(v, int)):
            return True
        return v == 0

    # Returns true if filter_by_slope is enabled and the stand at index i
    # has high slope or missing is missing slope data.
    def _has_high_slope(
        self,
        data: dict[str, list],
        stand_eligibility_params: StandEligibilityParams,
        slope_key: str,
        i: int,
    ) -> bool:
        if not stand_eligibility_params.filter_by_slope:
            return False
        if slope_key not in data.keys():
            return True
        v = data[slope_key][i]
        if not (isinstance(v, float) or isinstance(v, int)):
            return True
        return v > stand_eligibility_params.max_slope_in_percent_rise

    # Inserts an (x-pixel, y-pixel) pair into a dictionary mapping x-pixel to
    # y-pixel to input dataframe index.
    def _insert_value_in_position_dict(
        self, x: int, y: int, i: int, d: dict[int, set[int]]
    ) -> None:
        if x not in d.keys():
            d[x] = {}
        d[x][y] = i
