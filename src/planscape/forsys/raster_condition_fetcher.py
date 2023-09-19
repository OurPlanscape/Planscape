import numpy as np

from conditions.models import Condition
from conditions.raster_utils import (
    ConditionPixelValues,
    RasterPixelValues,
    get_condition_values_from_raster,
    get_raster_geo,
)
from attributes.models import Attribute
from attributes.raster_utils import get_attribute_values_from_raster
from django.contrib.gis.geos import GEOSGeometry
from planscape import settings


# Given a region and a list of priorities, fetches the relevant condition
# objects from DB.
# Output conditions may not be listed in the same order as priorities.
# Raises an error if any of the input priorities don't have a corresponding
# condition.
# Assumes each priority has a unique name linked to a single condition.
def get_conditions(region: str, priorities: list[str]) -> list[Condition]:
    conditions = list(
        Condition.objects.filter(is_raw=False)
        .select_related("condition_dataset")
        .filter(
            condition_dataset__condition_name__in=priorities,
            condition_dataset__region_name=region,
        )
    )
    if len(priorities) != len(conditions):
        raise Exception(
            "of %d priorities, only %d had conditions"
            % (len(priorities), len(conditions))
        )
    return conditions


# Given a list of land attributes, fetches the relevant attribute objects from
# DB.
# Output attributeess may not be listed in the same order as land_attributes.
# Raises an error if any of the input land_attributes don't have a
# corresponding attribute.
# Assumes each land attribute has a unique name linked to a single attribute.
def get_attributes(land_attributes: list[str]) -> list[Attribute]:
    attributes = list(Attribute.objects.filter(attribute_name__in=land_attributes))
    if len(land_attributes) != len(attributes):
        raise Exception(
            "of %d land attributes, only %d had attributes"
            % (len(land_attributes), len(attributes))
        )
    return attributes


# Fetches ConditionPixelValues and AttributePixelValues for multiple conditions
# and attributes and reformats them into a dataframe.
class RasterConditionFetcher:
    # Maps condition and attribute names to retrieved RasterPixelValues
    # instances.
    # This contains results that were directly returned by
    # conditions.raster_utils.get_condition_values_from_raster and attributes.
    # raster_utils.get_attribute_valuse_from_raster.
    raster_values: dict[str, RasterPixelValues]

    # The origin coordinate used to merging RasterPixelValues instances into
    # a single dataframe.
    topleft_coords: tuple[float, float]
    # The width of the image represented by the single dataframe.
    width: int
    height: int

    # A reformatted version of retrieved RasterPixelValues instances where
    # each row represents a pixel, and each column represents a specific
    # feature.
    # Column headers include:
    #   - x: the x pixel (starting from 0)
    #   - y: the y pixel (starting from 0)
    #   - <priority name>: each priority has its own column. If a priority
    #       value exists for a given pixel, the element corresponding to the
    #       pixel is a float; otherwise, it's np.nan.
    #       note: the value, for now, is 1.0 - normalized condition value.
    #   - <attribute name>: each attribute (e.g. slope, buildings) has its own
    #       column. If a priority value exists for a given pixel, the element
    #       corresponding to the pixel is a float; otherwise, it's np.nan.
    data: dict[str, list]
    # Maps x-pixel to y-pixel to a row index in the self.data dataframe.
    x_to_y_to_index: dict[int, dict[int, int]]

    def __init__(
        self,
        region: str,
        priorities: list[str],
        land_attributes: list[str],
        geo: GEOSGeometry,
    ):
        raster_geo = get_raster_geo(geo)

        conditions = get_conditions(region, priorities)
        attributes = get_attributes(land_attributes)
        self.raster_values = self._fetch_raster_values(
            conditions, attributes, raster_geo
        )

        self.topleft_coords = self._get_topleft_coords(self.raster_values)
        self.data, self.x_to_y_to_index = self._reformat_to_dataframe(
            self.raster_values, self.topleft_coords, priorities, land_attributes
        )
        self.width, self.height = self._get_width_and_height(self.x_to_y_to_index)

        # TODO: Only stands with at least one condition value are saved;
        # however, some stands may have 0 condition values, but still be useful
        # to include in the forsys input (think stand threshold, EPW). These
        # should be added to self.data.

    def _fetch_raster_values(
        self, conditions, attributes, raster_geo
    ) -> dict[str, RasterPixelValues]:
        raster_values = {}
        self._fetch_condition_raster_values(conditions, raster_geo, raster_values)
        self._fetch_attribute_raster_values(attributes, raster_geo, raster_values)
        return raster_values

    # Fetches condition raster values for a given GEOSGeometry and emits it in
    # a {condition name: ConditionPixelValues} dictionary.
    def _fetch_condition_raster_values(
        self,
        conditions: list[Condition],
        geo: GEOSGeometry,
        raster_values: dict[str, RasterPixelValues],
    ):
        for c in conditions:
            name = c.condition_dataset.condition_name
            values = get_condition_values_from_raster(geo, c.raster_name)
            if values is None:
                raise Exception(
                    "plan has no intersection with condition raster, %s" % name
                )
            raster_values[name] = values

    # Fetches attribute raster values for a given GEOSGeometry and emits it in
    # a {attribute name: AttributePixelValues} dictionary.
    def _fetch_attribute_raster_values(
        self,
        attributes: list[Attribute],
        geo: GEOSGeometry,
        raster_values: dict[str, RasterPixelValues],
    ):
        for a in attributes:
            name = a.attribute_name
            values = get_attribute_values_from_raster(geo, a.raster_name)
            if values is None:
                raise Exception(
                    "plan has no intersection with attribute raster, %s" % name
                )
            raster_values[name] = values

    # Identifies the topleft (aka origin) coordinates across all
    # ConditionPixelValues and AttributePixelValues instances in a {name:
    # RasterPixelValues} dictionary.
    def _get_topleft_coords(
        self, raster_values: dict[str, RasterPixelValues]
    ) -> tuple[float, float]:
        topleft_coords = None
        for k in raster_values.keys():
            topleft_coords = self._get_updated_topleft_coords(
                raster_values[k], topleft_coords
            )
        return topleft_coords

    # Given a RasterPixelValues instance and coordinates representing the
    # top-left origin, updates the coordinates if the RasterPixelValues are
    # further up/further left according to the scale in settings.CRS_9822_SCALE.
    def _get_updated_topleft_coords(
        self,
        raster_pixel_values: RasterPixelValues,
        topleft_coords: tuple[float, float] | None,
    ) -> tuple[float, float]:
        if raster_pixel_values["upper_left_coord_x"] is None:
            raise Exception(
                "fetched poorly-formatted raster pixel data"
                + " - missing upper_left_coord_x"
            )
        if raster_pixel_values["upper_left_coord_y"] is None:
            raise Exception(
                "fetched poorly-formatted raster pixel data"
                + " - missing upper_left_coord_x"
            )
        if topleft_coords is None:
            return (
                raster_pixel_values["upper_left_coord_x"],
                raster_pixel_values["upper_left_coord_y"],
            )
        return (
            self._select_topleft_coord(
                topleft_coords[0],
                raster_pixel_values["upper_left_coord_x"],
                settings.CRS_9822_SCALE[0],
            ),
            self._select_topleft_coord(
                topleft_coords[1],
                raster_pixel_values["upper_left_coord_y"],
                settings.CRS_9822_SCALE[1],
            ),
        )

    # Given two coordinates, selects the one that is further up/further left
    # according to the scale.
    def _select_topleft_coord(
        self, coord1: float, coord2: float, scale: float
    ) -> float:
        return min(coord1, coord2) if scale > 0 else max(coord1, coord2)

    # Reformats the input {name, RasterPixelValues} dictionary
    # into a dataframe where columns represent x pixel position, y pixel
    # position, and priority conditions, and rows represent individual pixels
    # and their condition values.
    def _reformat_to_dataframe(
        self,
        raster_values: dict[str, RasterPixelValues],
        topleft_coords: tuple[float, float],
        priorities: list[str],
        land_attributes: list[str],
    ) -> tuple[dict[str, list], dict[int, dict[int, int]]]:
        data = {"x": [], "y": []}
        for p in priorities:
            data[p] = []
        for a in land_attributes:
            data[a] = []
        x_to_y_to_index = {}

        self._reformat_condition_raster_values(
            raster_values,
            topleft_coords,
            priorities,
            land_attributes,
            data,
            x_to_y_to_index,
        )
        self._reformat_attribute_raster_values(
            raster_values,
            topleft_coords,
            priorities,
            land_attributes,
            data,
            x_to_y_to_index,
        )
        return data, x_to_y_to_index

    def _reformat_condition_raster_values(
        self,
        raster_values: dict[str, RasterPixelValues],
        topleft_coords: tuple[float, float],
        priorities: list[str],
        land_attributes: list[str],
        data: dict[str, list],
        x_to_y_to_index: dict[int, dict[int, int]],
    ):
        for condition in priorities:
            rv = raster_values[condition]
            for i in range(len(rv["pixel_dist_x"])):
                x = rv["pixel_dist_x"][i] + self._get_pixel_diff(
                    rv["upper_left_coord_x"], topleft_coords[0]
                )
                y = rv["pixel_dist_y"][i] + self._get_pixel_diff(
                    rv["upper_left_coord_y"], topleft_coords[1]
                )
                # TODO: using normalized conditions, impact is 1.0 - condition
                # score. This needs to be updated once we move to AP scores.
                value = 1.0 - rv["values"][i]

                if x not in x_to_y_to_index.keys():
                    x_to_y_to_index[x] = {}

                if y in x_to_y_to_index[x].keys():
                    index = x_to_y_to_index[x][y]
                    data[condition][index] = value
                else:
                    x_to_y_to_index[x][y] = len(data["x"])
                    data["x"].append(x)
                    data["y"].append(y)
                    for p in priorities:
                        if p == condition:
                            data[p].append(value)
                        else:
                            data[p].append(np.nan)
                    for a in land_attributes:
                        data[a].append(np.nan)

    def _reformat_attribute_raster_values(
        self,
        raster_values: dict[str, RasterPixelValues],
        topleft_coords: tuple[float, float],
        priorities: list[str],
        land_attributes: list[str],
        data: dict[str, list],
        x_to_y_to_index: dict[int, dict[int, int]],
    ):
        for attribute in land_attributes:
            rv = raster_values[attribute]
            for i in range(len(rv["pixel_dist_x"])):
                x = rv["pixel_dist_x"][i] + self._get_pixel_diff(
                    rv["upper_left_coord_x"], topleft_coords[0]
                )
                y = rv["pixel_dist_y"][i] + self._get_pixel_diff(
                    rv["upper_left_coord_y"], topleft_coords[1]
                )
                value = rv["values"][i]

                if x not in x_to_y_to_index.keys():
                    x_to_y_to_index[x] = {}

                if y in x_to_y_to_index[x].keys():
                    index = x_to_y_to_index[x][y]
                    data[attribute][index] = value
                else:
                    x_to_y_to_index[x][y] = len(data["x"])
                    data["x"].append(x)
                    data["y"].append(y)
                    for a in land_attributes:
                        if attribute == a:
                            data[a].append(value)
                        else:
                            data[a].append(np.nan)
                    for p in priorities:
                        data[p].append(np.nan)

    # Given an upper-left coordinate and a target upper-left coordinate,
    # computes the difference in pixel position.
    # i.e. pixel position i relative to the original upper-left coordinate will
    # be pixel position (i + pixel_diff) relative to the target upper-left
    # coordinate.
    def _get_pixel_diff(self, upper_left_coord, target_upper_left_coord) -> int:
        return int(
            (upper_left_coord - target_upper_left_coord) / settings.CRS_9822_SCALE[0]
        )

    # Returns the width and height of the raster image represented by self.data.
    def _get_width_and_height(
        self, x_to_y_to_index: dict[int, dict[int, int]]
    ) -> tuple[int, int]:
        width = max(x_to_y_to_index.keys()) + 1
        max_y = 0
        for x in x_to_y_to_index.keys():
            max_y = max(max_y, max(x_to_y_to_index[x].keys()))
        height = max_y + 1
        return width, height
