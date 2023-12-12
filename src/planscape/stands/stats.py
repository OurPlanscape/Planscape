import sys

from rasterstats.io import parse_feature
import numpy as np
from shapely.geometry import shape
from rasterstats.main import Raster
from rasterstats.utils import (
    key_assoc_val,
    rasterize_geom,
)


def get_zonal_stats(
    stand_geometry,
    raster,
    band=1,
    nodata=None,
    affine=None,
    all_touched=False,
    boundless=True,
    **kwargs,
):
    """Custom zonal statistics function. Strips out everything we don't
    need from the original one.
    """

    with Raster(raster, affine, nodata, band) as rast:
        feat = parse_feature(stand_geometry)

        geom = shape(feat["geometry"])
        geom_bounds = tuple(geom.bounds)
        fsrc = rast.read(bounds=geom_bounds, boundless=boundless)

        rv_array = rasterize_geom(geom, like=fsrc, all_touched=all_touched)

        # nodata mask
        isnodata = fsrc.array == fsrc.nodata

        # add nan mask (if necessary)
        has_nan = np.issubdtype(fsrc.array.dtype, np.floating) and np.isnan(
            fsrc.array.min()
        )
        if has_nan:
            isnodata = isnodata | np.isnan(fsrc.array)

        # Mask the source data array
        # mask everything that is not a valid value or not within our geom
        masked = np.ma.MaskedArray(fsrc.array, mask=(isnodata | ~rv_array))

        if sys.maxsize > 2**32 and issubclass(masked.dtype.type, np.integer):
            accum_dtype = "int64"
        else:
            accum_dtype = None  #

        if masked.compressed().size == 0:
            # nothing here, fill with None and move on
            return {
                "min": None,
                "max": None,
                "mean": None,
                "count": 0,
                "sum": None,
                "majority": None,
                "minority": None,
            }

        keys, counts = np.unique(masked.compressed(), return_counts=True)
        try:
            pixel_count = dict(
                zip([k.item() for k in keys], [c.item() for c in counts])
            )
        except AttributeError:
            pixel_count = dict(
                zip(
                    [np.asscalar(k) for k in keys],
                    [np.asscalar(c) for c in counts],
                )
            )

        return {
            "min": float(masked.min()),
            "max": float(masked.max()),
            "mean": float(masked.mean(dtype=accum_dtype)),
            "count": int(masked.count()),
            "sum": float(masked.sum(dtype=accum_dtype)),
            "majority": float(key_assoc_val(pixel_count, max)),
            "minority": float(key_assoc_val(pixel_count, min)),
        }
