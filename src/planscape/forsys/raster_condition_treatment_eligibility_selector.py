import numpy as np


# Identifies ...
# 1) pixels that are eligible for treatment and
# 2) pixels that are ineligible for treatment but may be included in project
# areas.
class RasterConditionTreatmentEligibilitySelector:
    # Pixels that are eligible for treatment, keyed by x-pixel, then y-pixel.
    # The value is the index representing the pixel.
    pixels_to_treat: dict[int, dict[int, int]]
    # Pixels that are ineligible for treatment, but may be included in project
    # areas, keyed by x-pixel, then y-pixel.
    # The value is the index representing the pixel.
    pixels_to_pass_through: dict[int, dict[int, int]]

    # Input parameter, data, is expected to be one of the outputs of class,
    # RasterConditionFetcher. Each row represents a pixel, and each column
    # represents a specific feature. Column headers include:
    #   - x: the x pixel (starting from 0)
    #   - y: the y pixel (starting from 0)
    #   - <priority name>: each priority has its own column. If a priority
    #       value exists for a given pixel, the element corresponding to the
    #       pixel is a float; otherwise, it's np.nan.
    #       note: the value, for now, is 1.0 - normalized condition value.
    def __init__(
            self, data: dict[str, list],
            priorities: list[str]):
        self._validate_data_and_priorities(data, priorities)

        self.pixels_to_treat, self.pixels_to_pass_through = \
            self._get_pixels_to_treat_and_pass_through(data, priorities)

    # Double-checks that the values for the priorties listed are available in
    # the data.
    def _validate_data_and_priorities(
            self, data: dict[str, list],
            priorities: list[str]):
        if "x" not in data.keys():
            raise Exception("data missing key, x")
        if "y" not in data.keys():
            raise Exception("data missing key, y")
        if len(data["x"]) != len(data["y"]):
            raise Exception(
                "data column lengths are unequal for keys, x and y")
        for p in priorities:
            if p not in data.keys():
                raise Exception("data missing input priority, %s" % (p))
            if len(data[p]) != len(data["x"]):
                raise Exception(
                    "data column lengths are unequal for keys, x and %s" %
                    (p))

    # Returns two dictionaries mapping each x-pixel to a set of y-pixels.
    # They capture the list of pixels to treat, and the list of pixels to pass
    # through via Patchmax's stand_threshold parameter.
    def _get_pixels_to_treat_and_pass_through(
            self,
        data: dict[str, list],
        priorities: list[str]) -> tuple[dict[int, dict[int, int]],
                                        dict[int, dict[int, int]]]:
        pixels_to_treat = {}
        pixels_to_pass_through = {}
        for i in range(len(data['x'])):
            x = data['x'][i]
            y = data['y'][i]
            if self._all_condition_scores_are_present(data, priorities, i):
                self._insert_value_in_position_dict(x, y, i, pixels_to_treat)
            else:
                self._insert_value_in_position_dict(
                    x, y, i, pixels_to_pass_through)
        return pixels_to_treat, pixels_to_pass_through

    # Returns true if all condition impact scores are present in the condition
    # impact score data frame (i.e. none of them are NaN).
    def _all_condition_scores_are_present(
        self, data: dict[str, list],
            priorities: list[str], i: int):
        for p in priorities:
            if np.isnan(data[p][i]):
                return False
        return True

    # Inserts an (x-pixel, y-pixel) pair into a dictionary mapping x-pixel to
    # y-pixel to data index.
    def _insert_value_in_position_dict(self, x: int, y: int, i: int,
                                       d: dict[int, set[int]]) -> None:
        if x not in d.keys():
            d[x] = {}
        d[x][y] = i
