import numpy as np

from django.contrib.gis.gdal import GDALRaster


# Merges multiple rasters into a single raster according to the scale and SRID
# of the first raster that is merged.
# Rasters are expected to be formatted offline. Thus, to keep the solution
# simple, exceptions will be thrown if ...
# ... a raster has skew != [0, 0]
# ... a raster has no bands or more than 1 band
# ... a raster's band has nodata_value != np.nan
# ... an added raster has a different scale than the original raster
# ... an added raster has a different srid than the original raster
# ... an added raster has an overlapping pixel with the original raster
class RasterMerger:
    merged_raster: GDALRaster

    def __init__(self, original_raster: GDALRaster = None) -> None:
        self.merged_raster = None
        if original_raster is not None:
            self.add_raster(original_raster)

    def add_raster(self, raster: GDALRaster) -> None:
        self._ensure_raster_is_valid(raster)

        if self.merged_raster is None:
            self.merged_raster = raster
            return

        self._ensure_raster_is_compatible_with_merged_raster(raster)
        self._merge_raster(raster)

    def _ensure_raster_is_valid(self, raster: GDALRaster) -> None:
        if raster.skew.x != 0 and raster.skew.y != 0:
            raise Exception(
                "invalid raster skew, [%f, %f] (expected [0, 0])"
                % (raster.skew.x, raster.skew.y)
            )
        if len(raster.bands) != 1:
            raise Exception(
                "invalid raster has %d bands (expected 1)" % (len(raster.bands))
            )
        if not np.isnan(raster.bands[0].nodata_value):
            raise Exception(
                "invalid raster has nodata value, %s (expected np.nan)"
                % (raster.bands[0].nodata_value)
            )

    def _ensure_raster_is_compatible_with_merged_raster(
        self, raster: GDALRaster
    ) -> None:
        if self.merged_raster is None:
            return

        scale = self.merged_raster.scale
        if raster.scale.x != scale.x and raster.scale.y != scale.y:
            raise Exception(
                "invalid raster scale, [%f, %f] " % (raster.scale.x, raster.scale.y)
                + "(expected original scale, [%f, %f])" % (scale.x, scale.y)
            )
        if raster.srid != self.merged_raster.srid:
            raise Exception(
                "invalid raster srid, %d (expected original srid, %d)"
                % (raster.srid, self.merged_raster.srid)
            )

    def _merge_raster(self, raster: GDALRaster) -> None:
        if self.merged_raster is None:
            self.add_raster(raster)
            return

        origin = self._compute_updated_origin(raster)

        dims = self._compute_updated_dimensions(raster, origin)
        width = dims[0]
        height = dims[1]

        r1 = raster.warp({"width": width, "height": height, "origin": origin})
        r2 = self.merged_raster.warp(
            {"width": width, "height": height, "origin": origin}
        )

        data = self._merge_band_data(r1.bands[0].data(), r2.bands[0].data())
        r2.bands[0].data(data)
        self.merged_raster = r2

    def _compute_updated_origin(self, raster: GDALRaster) -> list[float]:
        if self.merged_raster is None:
            return [raster.origin.x, raster.origin.y]

        scale = self.merged_raster.scale
        origin = self.merged_raster.origin

        return [
            self._select_origin(scale.x, [origin.x, raster.origin.x]),
            self._select_origin(scale.y, [origin.y, raster.origin.y]),
        ]

    def _select_origin(self, scale: float, origins: list[float]) -> float:
        if scale > 0:
            return min(origins)
        return max(origins)

    def _compute_updated_dimensions(
        self, raster: GDALRaster, updated_origin: list[float]
    ) -> list[float]:
        if self.merged_raster is None:
            return [raster.width, raster.height]

        scale = self.merged_raster.scale
        return [
            self._compute_dim(
                scale.x, raster.width, raster.origin.x, updated_origin[0]
            ),
            self._compute_dim(
                scale.y, raster.height, raster.origin.y, updated_origin[1]
            ),
        ]

    def _compute_dim(
        self,
        scale: float,
        existing_dim: int,
        existing_origin: float,
        target_origin: float,
    ) -> int:
        return int(np.ceil(existing_dim + (existing_origin - target_origin) / scale))

    def _merge_band_data(self, d1: np.array, d2: np.array) -> np.array:
        overlap = np.logical_and(~np.isnan(d1), ~np.isnan(d2))
        overlap_size = overlap.sum()
        if overlap_size > 0:
            raise Exception(
                "%d overlapping elements were detected " % overlap_size
                + "between the raster to be added and the merged raster"
            )
        indices_to_replace = np.logical_and(np.isnan(d1), ~np.isnan(d2))
        d1[indices_to_replace] = d2[indices_to_replace]
        return d1
