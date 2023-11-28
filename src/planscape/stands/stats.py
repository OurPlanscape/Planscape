import sys
import warnings

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


def gen_zonal_stats_experiment(
    vectors,
    raster,
    layer=0,
    band=1,
    nodata=None,
    affine=None,
    stats=None,
    all_touched=False,
    categorical=False,
    category_map=None,
    add_stats=None,
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
    stats, run_count = check_stats(stats, categorical)

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
        features_iter = read_features(vectors, layer)
        geoms = []
        for i, feat in enumerate(features_iter, start=1):
            feat_geom = shape(feat["geometry"])
            if "Point" in feat_geom.geom_type:
                feat_geom = boxify_points(feat_geom, rast)
            geoms.append((feat_geom, i))

        n_features = len(geoms)
        geom_bounds = tuple(unary_union([g for g, i in geoms]).bounds)

        fsrc = rast.read(bounds=geom_bounds, boundless=boundless)

        # rasterized geometry
        # rv_array = rasterize(geom, like=fsrc, all_touched=all_touched)

        geoms_as_array = rasterize(
            geoms,
            out_shape=fsrc.shape,
            transform=fsrc.affine,
            fill=0,
            dtype="uint32",
            all_touched=all_touched,
        )

    # Align original raster and new array with geom IDs burned in.
    stacked_arrays = np.stack([fsrc.array, geoms_as_array])

    geom_ids, pixel_count = np.unique(stacked_arrays[1], return_counts=True)

    # Drop the fill value which gets placed between polygons. It may not
    # be present if the raster is 100% covered by polygons
    if geom_ids[0] == 0:
        geom_ids = geom_ids[1:]
        pixel_count = pixel_count[1:]

    largest_geom = pixel_count.max()

    # Another array with shape (n_geoms, largest_geom_n_pixels)
    # where values within every geom are located in the respective row,
    # and any extra padding will be masked out.
    sorted_array = np.empty(shape=(n_features, largest_geom))
    sorted_array[:] = fsrc.nodata

    for geom_i, n_pixels in zip(geom_ids, pixel_count):
        sorted_array[int(geom_i) - 1, 0:n_pixels] = stacked_arrays[0][
            stacked_arrays[1] == geom_i
        ]

    sorted_array = np.ma.masked_equal(sorted_array, fsrc.nodata)

    feature_stats = [{} for i in range(n_features)]

    # convert any nans to None. This can happen when a feature only covers
    # nodata values
    float_or_none = lambda x: None if np.isnan(x) else float(x)

    if "mean" in stats:
        for i, value in enumerate(sorted_array.mean(1).filled(np.nan)):
            feature_stats[i]["mean"] = float_or_none(value)
    if "max" in stats:
        for i, value in enumerate(sorted_array.max(1).filled(np.nan)):
            feature_stats[i]["max"] = float_or_none(value)
    if "min" in stats:
        for i, value in enumerate(sorted_array.min(1).filled(np.nan)):
            feature_stats[i]["min"] = float_or_none(value)
    if "sum" in stats:
        for i, value in enumerate(sorted_array.sum(1).filled(np.nan)):
            feature_stats[i]["sum"] = float_or_none(value)
    if "std" in stats:
        for i, value in enumerate(sorted_array.std(1).filled(np.nan)):
            feature_stats[i]["std"] = float_or_none(value)
    if "median" in stats:
        for i, value in enumerate(np.ma.median(sorted_array, axis=1).filled(np.nan)):
            feature_stats[i]["median"] = float_or_none(value)

    return feature_stats
