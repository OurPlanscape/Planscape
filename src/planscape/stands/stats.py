import sys
import warnings

from rasterstats.io import parse_feature
import numpy as np
from affine import Affine
from shapely.geometry import shape
from shapely.ops import unary_union
from rasterio.features import rasterize
from rasterstats.io import Raster, read_features
from rasterstats.utils import (
    boxify_points,
    check_stats,
    get_percentile,
    key_assoc_val,
    rasterize_geom,
    remap_categories,
)


def gen_zonal_stats2(
    stand_id,
    stand_geometry,
    stand_cache,
    raster,
    layer=0,
    band=1,
    nodata=None,
    affine=None,
    stats=None,
    all_touched=False,
    zone_func=None,
    raster_out=False,
    prefix=None,
    geojson_out=False,
    boundless=True,
    **kwargs,
):
    """Zonal statistics of raster values aggregated to vector geometries.

    Parameters
    ----------
    vectors: path to an vector source or geo-like python objects

    raster: ndarray or path to a GDAL raster source
        If ndarray is passed, the ``affine`` kwarg is required.

    layer: int or string, optional
        If `vectors` is a path to a fiona source,
        specify the vector layer to use either by name or number.
        defaults to 0

    band: int, optional
        If `raster` is a GDAL source, the band number to use (counting from 1).
        defaults to 1.

    nodata: float, optional
        If `raster` is a GDAL source, this value overrides any NODATA value
        specified in the file's metadata.
        If `None`, the file's metadata's NODATA value (if any) will be used.
        defaults to `None`.

    affine: Affine instance
        required only for ndarrays, otherwise it is read from src

    stats:  list of str, or space-delimited str, optional
        Which statistics to calculate for each zone.
        All possible choices are listed in ``utils.VALID_STATS``.
        defaults to ``DEFAULT_STATS``, a subset of these.

    all_touched: bool, optional
        Whether to include every raster cell touched by a geometry, or only
        those having a center point within the polygon.
        defaults to `False`

    categorical: bool, optional

    category_map: dict
        A dictionary mapping raster values to human-readable categorical names.
        Only applies when categorical is True

    add_stats: dict
        with names and functions of additional stats to compute, optional

    zone_func: callable
        function to apply to zone ndarray prior to computing stats

    raster_out: boolean
        Include the masked numpy array for each feature?, optional

        Each feature dictionary will have the following additional keys:
        mini_raster_array: The clipped and masked numpy array
        mini_raster_affine: Affine transformation
        mini_raster_nodata: NoData Value

    prefix: string
        add a prefix to the keys (default: None)

    geojson_out: boolean
        Return list of GeoJSON-like features (default: False)
        Original feature geometry and properties will be retained
        with zonal stats appended as additional properties.
        Use with `prefix` to ensure unique and meaningful property names.

    boundless: boolean
        Allow features that extend beyond the raster dataset’s extent, default: True
        Cells outside dataset extents are treated as nodata.

    Returns
    -------
    generator of dicts (if geojson_out is False)
        Each item corresponds to a single vector feature and
        contains keys for each of the specified stats.

    generator of geojson features (if geojson_out is True)
        GeoJSON-like Feature as python dict
    """
    stats, run_count = check_stats(stats, False)

    # Handle 1.0 deprecations
    transform = kwargs.get("transform")
    if transform:
        warnings.warn(
            "GDAL-style transforms will disappear in 1.0. "
            "Use affine=Affine.from_gdal(*transform) instead",
            DeprecationWarning,
        )
        if not affine:
            affine = Affine.from_gdal(*transform)

    cp = kwargs.get("copy_properties")
    if cp:
        warnings.warn(
            "Use `geojson_out` to preserve feature properties", DeprecationWarning
        )

    band_num = kwargs.get("band_num")
    if band_num:
        warnings.warn("Use `band` to specify band number", DeprecationWarning)
        band = band_num

    with Raster(raster, affine, nodata, band) as rast:
        feat = parse_feature(stand_geometry)

        geom = shape(feat["geometry"])
        geom_bounds = tuple(geom.bounds)
        fsrc = rast.read(bounds=geom_bounds, boundless=boundless)
        try:
            rv_array = stand_cache[stand_id]
        except KeyError:
            rv_array = rasterize_geom(geom, like=fsrc, all_touched=all_touched)
            stand_cache[stand_id] = rv_array

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

        # If we're on 64 bit platform and the array is an integer type
        # make sure we cast to 64 bit to avoid overflow for certain numpy ops
        if sys.maxsize > 2**32 and issubclass(masked.dtype.type, np.integer):
            accum_dtype = "int64"
        else:
            accum_dtype = None  # numpy default

        # execute zone_func on masked zone ndarray
        if zone_func is not None:
            if not callable(zone_func):
                raise TypeError(
                    "zone_func must be a callable function "
                    "which accepts a single `zone_array` arg."
                )
            value = zone_func(masked)

            # check if zone_func has return statement
            if value is not None:
                masked = value

        if masked.compressed().size == 0:
            # nothing here, fill with None and move on
            feature_stats = {stat: None for stat in stats}
            if "count" in stats:  # special case, zero makes sense here
                feature_stats["count"] = 0
        else:
            if run_count:
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

            feature_stats = {}

            if "min" in stats:
                feature_stats["min"] = float(masked.min())
            if "max" in stats:
                feature_stats["max"] = float(masked.max())
            if "mean" in stats:
                feature_stats["mean"] = float(masked.mean(dtype=accum_dtype))
            if "count" in stats:
                feature_stats["count"] = int(masked.count())
            # optional
            if "sum" in stats:
                feature_stats["sum"] = float(masked.sum(dtype=accum_dtype))
            if "std" in stats:
                feature_stats["std"] = float(masked.std())
            if "median" in stats:
                feature_stats["median"] = float(np.median(masked.compressed()))
            if "majority" in stats:
                feature_stats["majority"] = float(key_assoc_val(pixel_count, max))
            if "minority" in stats:
                feature_stats["minority"] = float(key_assoc_val(pixel_count, min))
            if "unique" in stats:
                feature_stats["unique"] = len(list(pixel_count.keys()))
            if "range" in stats:
                try:
                    rmin = feature_stats["min"]
                except KeyError:
                    rmin = float(masked.min())
                try:
                    rmax = feature_stats["max"]
                except KeyError:
                    rmax = float(masked.max())
                feature_stats["range"] = rmax - rmin

        if "nodata" in stats or "nan" in stats:
            featmasked = np.ma.MaskedArray(fsrc.array, mask=(~rv_array))

            if "nodata" in stats:
                feature_stats["nodata"] = float((featmasked == fsrc.nodata).sum())
            if "nan" in stats:
                feature_stats["nan"] = (
                    float(np.isnan(featmasked).sum()) if has_nan else 0
                )

        return feature_stats
