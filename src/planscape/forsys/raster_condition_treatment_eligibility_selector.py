import numpy as np

# Identifies ...
# 1) pixels that are eligible for treatment and
# 2) pixels that are ineligible for treatment but may be included in project
# areas.


class RasterConditionTreatmentEligibilitySelector:
    pixels_to_treat: dict[int, set[int]]
    pixels_to_pass_through: dict[int, set[int]]

    def __init__(
            self, data: dict[str, list],
            priorities: list[str]):
        self.pixels_to_treat, self.pixels_to_pass_through = \
            self._get_pixels_to_treat_and_pass_through(data, priorities)

    # A temporary method until ClusteredStands is modified to accept different
    # input types.
    def get_values_eligible_for_treatment(
            self, priorities: list[str],
            data: dict[str, list],
            x_to_y_to_index: dict[int, dict[int, int]]):
        output = {}
        for x in self.pixels_to_treat.keys():
            if x not in x_to_y_to_index.keys():
                continue
            if x not in output.keys():
                output[x] = {}
            for y in self.pixels_to_treat[x]:
                if y not in x_to_y_to_index[x].keys():
                    continue
                i = x_to_y_to_index[x][y]
                if y not in output[x].keys():
                    output[x][y] = {}
                for p in priorities:
                    output[x][y][p] = data[p][i]
        return output

    def _get_pixels_to_treat_and_pass_through(
            self,
        data: dict[str, list],
        priorities: list[str]) -> tuple[dict[int, set[int]],
                                        dict[int, set[int]]]:

        pixels_to_treat = {}
        pixels_to_pass_through = {}
        for i in range(len(data['x'])):
            x = data['x'][i]
            y = data['y'][i]
            if self._all_condition_scores_are_present(data, priorities, i):
                self._insert_value_in_position_dict(x, y, pixels_to_treat)
            else:
                self._insert_value_in_position_dict(
                    x, y, pixels_to_pass_through)
        return pixels_to_treat, pixels_to_pass_through

    def _all_condition_scores_are_present(
        self, data: dict[str, list],
            priorities: list[str], i: int):
        for p in priorities:
            if np.isnan(data[p][i]):
                return False
        return True

    def _insert_value_in_position_dict(self, x: int, y: int,
                                       d: dict[int, set[int]]) -> None:
        if x in d.keys():
            d[x].add(y)
        else:
            d[x] = {y}
