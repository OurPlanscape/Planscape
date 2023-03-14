from conditions.models import BaseCondition, Condition
from conditions.raster_utils import (ConditionPixelValues,
                                     get_condition_values_from_raster,
                                     get_raster_geo)
from django.contrib.gis.geos import GEOSGeometry
from planscape import settings


# Given a list of priorities (i.e. condition names), returns a dictionary
# mapping condition ID's to condition names.
# Raises an error if any of the priorities don't have a corresponding condition.
# TODO: this may not be necessary if we use Django's "select_related" function.
def get_base_condition_ids_to_names(region: str,
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
def get_conditions(condition_ids: list[int]) -> list[Condition]:
    conditions = list(Condition.objects.filter(
        condition_dataset_id__in=condition_ids).filter(
        is_raw=False).all())
    if len(condition_ids) != len(conditions):
        raise Exception(
            "of %d priorities, only %d had conditions" %
            (len(condition_ids),
                len(conditions)))
    return conditions


class RasterConditionFetcher:
    # Maps condition names to retrieved ConditionPixelValues instances.
    conditions_to_raster_values: dict[str, ConditionPixelValues]
    # The origin coordinate used when merging ConditionPixelValues instances, which may have different top-left coordinates, across all conditions.
    topleft_coords: tuple[float, float]

    def __init__(self, region: str, priorities: list[str], geo: GEOSGeometry):
        raster_geo = get_raster_geo(geo)

        base_condition_ids_to_names = get_base_condition_ids_to_names(
            region, priorities)
        conditions = get_conditions(base_condition_ids_to_names.keys())

        self.conditions_to_raster_values, self.topleft_coords = \
            self._fetch_conditions_to_raster_values(
                conditions, base_condition_ids_to_names, raster_geo)

    def _fetch_conditions_to_raster_values(
            self, conditions: list[str],
            base_condition_ids_to_names: dict[int, str],
            geo: GEOSGeometry):
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

    def _get_updated_topleft_coords(
            self, condition_pixel_values: ConditionPixelValues,
            topleft_coords: tuple[float, float] | None) -> tuple[float, float]:
        # TODO: these shouldn't be local constants.
        UPPER_LEFT_COORD_X_KEY = "upper_left_coord_x"
        UPPER_LEFT_COORD_Y_KEY = "upper_left_coord_y"

        if condition_pixel_values[UPPER_LEFT_COORD_X_KEY] is None:
            raise Exception(
                "fetched poorly-formatted raster pixel data" +
                " - missing " + UPPER_LEFT_COORD_X_KEY)
        if condition_pixel_values[UPPER_LEFT_COORD_Y_KEY] is None:
            raise Exception(
                "fetched poorly-formatted raster pixel data" +
                " - missing " + UPPER_LEFT_COORD_Y_KEY)
        if topleft_coords is None:
            return (condition_pixel_values[UPPER_LEFT_COORD_X_KEY],
                    condition_pixel_values[UPPER_LEFT_COORD_Y_KEY])
        return (
            self._select_topleft_coord(topleft_coords[0],
                                       condition_pixel_values[UPPER_LEFT_COORD_X_KEY],
                                       settings.CRS_9822_SCALE[0]),
            self._select_topleft_coord(topleft_coords[1],
                                       condition_pixel_values[UPPER_LEFT_COORD_Y_KEY],
                                       settings.CRS_9822_SCALE[1]))

    # Given two coordinates, selects the one that represents a lower pixel
    # distance index according to the scale.
    def _select_topleft_coord(
            self, coord1: float, coord2: float, scale: float) -> float:
        return min(coord1, coord2) if scale > 0 else max(coord1, coord2)
