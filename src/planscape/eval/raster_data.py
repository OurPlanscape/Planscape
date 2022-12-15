"""Classes/structs to wrap raster data read from local files."""

from base.condition_types import ConditionMatrix


class RasterData:
    def __init__(self, raster, profile):
        self.raster = raster
        self.profile = profile

    raster: ConditionMatrix
    profile: dict
