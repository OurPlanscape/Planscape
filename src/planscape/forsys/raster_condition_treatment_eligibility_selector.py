from conditions.raster_utils import ConditionPixelValues
from django.contrib.gis.geos import GEOSGeometry, Point
from planscape import settings


class RasterConditionTreatmentEligibilitySelector:
    width: int
    height: int

    x_to_y_to_condition_to_values: dict[int, dict[int, dict[str, float]]]
    pixels_to_treat: dict[int, set[int]]
    pixels_to_pass_through: dict[int, set[int]]

    def __init__(
            self, conditions_to_raster_values: dict
            [str, ConditionPixelValues],
            topleft_coords: tuple[float, float],
            conditions: list[str],
            geo: GEOSGeometry):
        self.x_to_y_to_condition_to_values, self.width, self.height = \
            self._merge_condition_raster_values(
                conditions_to_raster_values, topleft_coords)

        self.pixels_to_treat, self.pixels_to_pass_through = self._get_pixels_to_treat_and_pass_through(
            self.x_to_y_to_condition_to_values, self.width, self.height, topleft_coords, geo, conditions)

    def get_values_eligible_for_treatment(self) -> \
            dict[int, dict[int, dict[str, float]]]:
        eligible_x_to_y_to_condition_to_values = {}
        for x in self.pixels_to_treat.keys():
            if x not in eligible_x_to_y_to_condition_to_values.keys():
                eligible_x_to_y_to_condition_to_values[x] = {}
            for y in self.pixels_to_treat[x]:
                if y not in eligible_x_to_y_to_condition_to_values[x].keys():
                    eligible_x_to_y_to_condition_to_values[x][y] = \
                        self.x_to_y_to_condition_to_values[x][y]
        return eligible_x_to_y_to_condition_to_values

    def _merge_condition_raster_values(
            self,
            conditions_to_raster_values: dict[str, ConditionPixelValues],
            topleft_coords: tuple[float, float]
    ) -> tuple[dict[int, dict[int, dict[str, float]]], int, int]:
        UPPER_LEFT_COORD_X_KEY = "upper_left_coord_x"
        UPPER_LEFT_COORD_Y_KEY = "upper_left_coord_y"
        PIXEL_DIST_X_KEY = "pixel_dist_x"
        PIXEL_DIST_Y_KEY = "pixel_dist_y"
        VALUES_KEY = "values"

        pixel_dist_x_to_y_to_condition_to_values = {}
        max_x = None
        max_y = None

        for condition_name in conditions_to_raster_values.keys():
            values = conditions_to_raster_values[condition_name]
            xdiff = self._get_pixel_dist_diff(
                values[UPPER_LEFT_COORD_X_KEY],
                topleft_coords[0],
                settings.CRS_9822_SCALE[0])
            ydiff = self._get_pixel_dist_diff(
                values[UPPER_LEFT_COORD_Y_KEY],
                topleft_coords[1],
                settings.CRS_9822_SCALE[1])
            for i in range(len(values[PIXEL_DIST_X_KEY])):
                x = values[PIXEL_DIST_X_KEY][i] + xdiff
                y = values[PIXEL_DIST_Y_KEY][i] + ydiff
                max_x = self._update_dimension(max_x, x)
                max_y = self._update_dimension(max_y, y)
                # TODO: adjust the 1 - score logic as we move to AP score.
                value = 1.0 - values[VALUES_KEY][i]
                self._insert_value_in_position_and_condition_dict(
                    x, y, condition_name, value,
                    pixel_dist_x_to_y_to_condition_to_values)
        return (pixel_dist_x_to_y_to_condition_to_values, max_x + 1, max_y + 1)

    # Computes the distance, in pixels, between two coordinates.
    def _get_pixel_dist_diff(
            self, coord: float, origin_coord: float, scale: float) -> int:
        return int((coord - origin_coord) / scale)

    def _update_dimension(self, x: int, new_x: int) -> int:
        if x is None:
            return new_x
        return max(x, new_x)

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

    def _get_pixels_to_treat_and_pass_through(
            self,
            x_to_y_to_conditions_to_values:
            dict[int, dict[int, dict[str, float]]],
            width: int, height: int, topleft_coords: tuple[float, float],
            geo: GEOSGeometry, conditions: list[str]) -> tuple[
            dict[int, dict[int, dict[str, float]]],
            dict[int, dict[int, dict[str, float]]]]:
        pixels_to_treat = {}
        pixels_to_pass_through = {}
        for x in range(width):
            for y in range(height):
                p = self._get_pixel_point(
                    x, y, topleft_coords)
                if not geo.intersects(self._get_pixel_point(
                        x, y, topleft_coords)):
                    continue
                if self._has_all_condition_values(
                        x_to_y_to_conditions_to_values, x, y, conditions):
                    self._insert_value_in_position_dict(x, y, pixels_to_treat)
                else:
                    self._insert_value_in_position_dict(
                        x, y, pixels_to_pass_through)
        return pixels_to_treat, pixels_to_pass_through

    def _get_pixel_point(self, x, y, topleft_coords):
        p = Point((topleft_coords[0] + x * settings.CRS_9822_SCALE[0],
                   topleft_coords[1] + y * settings.CRS_9822_SCALE[1]))
        p.srid = settings.CRS_FOR_RASTERS
        return p

    def _has_all_condition_values(
            self, x_to_y_to_conditions_to_values, x, y, conditions):
        if x not in x_to_y_to_conditions_to_values.keys():
            return False
        y_to_conditions_to_values = x_to_y_to_conditions_to_values[x]
        if y not in y_to_conditions_to_values.keys():
            return False
        conditions_to_values = y_to_conditions_to_values[y]
        for c in conditions:
            if c not in conditions_to_values.keys():
                return False
        return True

    def _insert_value_in_position_dict(self, x: int, y: int,
                                       d: dict[int, set[int]]) -> None:
        if x in d.keys():
            d[x].add(y)
        else:
            d[x] = {y}
