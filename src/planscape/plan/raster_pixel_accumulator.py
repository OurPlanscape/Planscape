import numpy as np

from django.conf import settings
from django.contrib.gis.gdal import (
    CoordTransform,
    GDALRaster,
    OGRGeometry,
    SpatialReference,
)
from django.contrib.gis.geos import Point
from typing import TypedDict


class RasterPixelAccumulatorStats(TypedDict):
    # A sum over raster pixel values
    sum: float
    # The number of raster pixels processed
    count: int


# Aggregates pixel-level statistics across rasters for pixels that fall within
# a given geometry.
# Caveats:
# - This doesn't track positions of pixels that have been processed so
# it's up to the user to avoid counting a pixel multiple times.
# - This will not raise a warning if a portion of the geometry falls outside of
# the area covered by processed rasters.
class RasterPixelAccumulator:
    # A constant representing the spatial reference of rasters being proccessed.
    # TODO: remove if we switch from non-standard 9822 to 3310.
    RASTER_SR = SpatialReference(settings.CRS_9822_PROJ4)
    RASTER_SRID = settings.CRS_FOR_RASTERS

    # Only raster pixels that fall within this geometry are counted.
    geo: OGRGeometry
    # Rasters that are counted may be associated with different conditions.
    # This maps condition name to accumulated pixel statistics.
    stats: dict[str, RasterPixelAccumulatorStats]

    def __init__(self, geo: OGRGeometry) -> None:
        self.init_geo(geo)

    def init_geo(self, geo: OGRGeometry) -> None:
        self.geo = geo.clone()
        self.geo.transform(
            CoordTransform(SpatialReference(self.geo.srid), self.RASTER_SR)
        )
        self.geo.srid = self.RASTER_SRID

        self.reset_stats()

    def reset_stats(self) -> None:
        self.stats = {}

    def process_raster(self, raster: GDALRaster, name: str) -> None:
        self._initialize_stats(name)

        data = raster.bands[0].data()

        pixel_extent = self._get_geo_pixel_extent(raster)
        for x in self._get_pixel_range(pixel_extent[0], pixel_extent[2], raster.width):
            for y in self._get_pixel_range(
                pixel_extent[1], pixel_extent[3], raster.height
            ):
                if np.isnan(data[y][x]):
                    continue
                if not self._pixel_point_is_in_geo(x, y, raster):
                    continue
                self.stats[name]["sum"] = self.stats[name]["sum"] + data[y][x]
                self.stats[name]["count"] = self.stats[name]["count"] + 1

    def _initialize_stats(self, name: str) -> None:
        if name not in self.stats.keys():
            self.stats[name] = RasterPixelAccumulatorStats({"sum": 0, "count": 0})

    def _get_geo_pixel_extent(self, raster: GDALRaster) -> list[int]:
        scale = raster.scale
        origin = raster.origin
        extent = self.geo.extent
        xs = self._compute_pixel_extent(extent[0], extent[2], scale.x, origin.x)
        ys = self._compute_pixel_extent(extent[1], extent[3], scale.y, origin.y)
        return [xs[0], ys[0], xs[1], ys[1]]

    def _compute_pixel_extent(
        self, x_min: float, x_max: float, scale: float, origin: float
    ) -> list[int]:
        if scale > 0:
            return [
                int(np.floor(self._compute_ind(x_min, scale, origin))),
                int(np.ceil(self._compute_ind(x_max, scale, origin))),
            ]
        return [
            int(np.floor(self._compute_ind(x_max, scale, origin))),
            int(np.ceil(self._compute_ind(x_min, scale, origin))),
        ]

    def _compute_ind(self, x: float, scale: float, origin: float) -> int:
        return (x - origin) / scale

    def _get_pixel_range(self, i_min: int, i_max: int, width: int) -> list[int]:
        return range(max(0, i_min), min(width, i_max + 1))

    def _pixel_point_is_in_geo(self, x: int, y: int, raster: GDALRaster) -> bool:
        scale = raster.scale
        origin = raster.origin
        p = Point(
            (
                self._compute_coordinate(x, scale.x, origin.x),
                self._compute_coordinate(y, scale.y, origin.y),
            )
        )
        return p.intersects(self.geo)

    def _compute_coordinate(self, x: int, scale: float, origin: float) -> float:
        return origin + scale * x
