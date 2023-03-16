import numpy as np

from conditions.models import Condition
from conditions.raster_utils import (ConditionPixelValues,
                                     get_condition_values_from_raster,
                                     get_raster_geo)
from django.contrib.gis.geos import GEOSGeometry
from planscape import settings


# Given a region and a list of priorities, fetches the relevant condition 
# objects from DB.
# Output conditions may not be listed in the same order as condition_ids.
# Raises an error if any of the input priorities don't have a corresponding
# condition.
# Assumes each priority has a single condition.
def get_conditions(region: str, priorities: list[str]) -> list[Condition]:
    conditions = list(
        Condition.objects.filter(is_raw=False).select_related(
            'condition_dataset').filter(
            condition_dataset__condition_name__in=priorities,
            condition_dataset__region_name=region))
    if len(priorities) != len(conditions):
        raise Exception(
            "of %d priorities, only %d had conditions" %
            (len(priorities), len(conditions)))
    return conditions


# Fetches ConditionPixelValues for multiple conditions and reformats them into
# a dataframe.
class RasterConditionFetcher:
    # Maps condition names to retrieved ConditionPixelValues instances.
    # This contains results that were directly returned by 
    # conditions.raster_utils.get_condition_values_from_raster.
    conditions_to_raster_values: dict[str, ConditionPixelValues]

    # The origin coordinate used to merging ConditionPixelValues instances into
    # a single dataframe.
    topleft_coords: tuple[float, float]
    # The width of the image represented by the single dataframe.
    width: int
    height: int
    # A reformatted version of retrieved ConditionPixelValues instances where
    # each row represents a pixel, and each column represents a specific 
    # feature.
    # Column headers include:
    #   - x: the x pixel (starting from 0)
    #   - y: the y pixel (starting from 0)
    #   - <priority name>: each priority has its own column. If a priority
    #       value exists for a given pixel, the element corresponding to the
    #       pixel is a float; otherwise, it's np.nan.
    #       note: the value, for now, is 1.0 - normalized condition value.
    data: dict[str, list]
    # Maps x-pixel to y-pixel to a row index in the self.data dataframe.
    x_to_y_to_index: dict[int, dict[int, int]]

    def __init__(self, region: str, priorities: list[str], geo: GEOSGeometry):
        raster_geo = get_raster_geo(geo)

        conditions = get_conditions(region, priorities)
        self.conditions_to_raster_values = \
            self._fetch_conditions_to_raster_values(
                conditions, raster_geo)

        self.topleft_coords = self._get_topleft_coords(
            self.conditions_to_raster_values)
        self.data, self.x_to_y_to_index = self._reformat_to_dataframe(
            self.conditions_to_raster_values, priorities)
        self.width, self.height = self._get_width_and_height(
            self.x_to_y_to_index)
        
        # TODO: Only stands with at least one condition value are saved; 
        # however, some stands may have 0 condition values, but still be useful 
        # to include in the forsys input (think stand threshold, EPW). These 
        # should be added to self.data.

    # Fetches condition raster values for a given GEOSGeometry and emits it in
    # a {condition name: ConditionPixelValues} dictionary.
    def _fetch_conditions_to_raster_values(
            self, conditions: list[Condition],
            geo: GEOSGeometry) -> dict[str, ConditionPixelValues]:
        conditions_to_raster_values = {}
        for c in conditions:
            name = c.condition_dataset.condition_name
            values = get_condition_values_from_raster(geo, c.raster_name)
            if values is None:
                raise Exception(
                    "plan has no intersection with condition raster, %s" %
                    name)
            conditions_to_raster_values[name] = values
        return conditions_to_raster_values

    # Identifies the topleft (aka origin) coordinates across all
    # ConditionPixelValues instances in a {condition name:
    # ConditionPixelValues} dictionary.
    def _get_topleft_coords(
            self,
            conditions_to_raster_values:
            dict[str, ConditionPixelValues]) -> tuple[float, float]:
        topleft_coords = None
        for c in conditions_to_raster_values.keys():
            topleft_coords = self._get_updated_topleft_coords(
                conditions_to_raster_values[c], topleft_coords)
        return topleft_coords

    # Given a ConditionPixelValues instance and coordinates representing the
    # top-left origin, updates the coordinates if the ConditionPixelValues are
    # further up/further left according to the scale in settings.CRS_9822_SCALE.
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
                " - missing upper_left_coord_x")
        if topleft_coords is None:
            return (condition_pixel_values["upper_left_coord_x"],
                    condition_pixel_values["upper_left_coord_y"])
        return (
            self._select_topleft_coord(
                topleft_coords[0],
                condition_pixel_values["upper_left_coord_x"],
                settings.CRS_9822_SCALE[0]),
            self._select_topleft_coord(
                topleft_coords[1],
                condition_pixel_values["upper_left_coord_y"],
                settings.CRS_9822_SCALE[1]))

    # Given two coordinates, selects the one that is further up/further left 
    # according to the scale.
    def _select_topleft_coord(
            self, coord1: float, coord2: float, scale: float) -> float:
        return min(coord1, coord2) if scale > 0 else max(coord1, coord2)

    # Reformats the input {condition name, ConditionPixelValues} dictionary
    # into a dataframe where columns represent x pixel position, y pixel
    # position, and priority conditions, and rows represent individual pixels
    # and their condition values.
    def _reformat_to_dataframe(
        self,
        conditions_to_raster_values: dict[str, ConditionPixelValues],
        priorities: list[str]) -> tuple[dict[str, list],
                                        dict[int, dict[int, int]]]:
        data = {'x': [], 'y': []}
        for p in priorities:
            data[p] = []
        x_to_y_to_index = {}

        for c in conditions_to_raster_values.keys():
            raster_values = conditions_to_raster_values[c]
            for i in range(len(raster_values["pixel_dist_x"])):
                x = raster_values["pixel_dist_x"][i]
                y = raster_values["pixel_dist_y"][i]
                # TODO: using normalized conditions, impact is 1.0 - condition
                # score. This needs to be updated once we move to AP scores.
                value = 1.0 - raster_values["values"][i]

                if x not in x_to_y_to_index.keys():
                    x_to_y_to_index[x] = {}

                if y in x_to_y_to_index[x].keys():
                    index = x_to_y_to_index[x][y]
                    data[c][index] = value
                else:
                    x_to_y_to_index[x][y] = len(data['x'])
                    data['x'].append(x)
                    data['y'].append(y)
                    for p in priorities:
                        if p == c:
                            data[p].append(value)
                        else:
                            data[p].append(np.nan)
        return data, x_to_y_to_index

    # Returns the width and height of the raster image represented by self.data.
    def _get_width_and_height(
            self,
            x_to_y_to_index: dict[int, dict[int, int]]) -> tuple[int, int]:
        width = max(x_to_y_to_index.keys()) + 1
        max_y = 0
        for x in x_to_y_to_index.keys():
            max_y = max(max_y, max(x_to_y_to_index[x].keys()))
        height = max_y + 1
        return width, height
