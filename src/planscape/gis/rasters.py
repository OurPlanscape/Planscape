import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import rasterio
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from gis.core import get_layer_info, get_random_output_file
from gis.info import get_gdal_env
from rasterio.crs import CRS
from rasterio.features import geometry_mask, shapes, sieve
from rasterio.transform import from_bounds
from rasterio.warp import (
    Resampling,
    calculate_default_transform,
    reproject,
    transform_geom,
)
from rio_cogeo.cogeo import cog_translate, cog_validate
from rio_cogeo.profiles import cog_profiles
from shapely.geometry import mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

log = logging.getLogger(__name__)
Number = Union[int, float]


def get_profile(
    input_profile: Dict[str, Any],
    crs: str,
    transform,
    width: int,
    height: int,
    blockxsize: int = 512,
    blockysize: int = 512,
    compress: str = "DEFLATE",
) -> Dict[str, Any]:
    return {
        **input_profile,
        "crs": crs,
        "transform": transform,
        "blockxsize": blockxsize,
        "blockysize": blockysize,
        "compress": compress,
        "tiled": True,
        "width": width,
        "height": height,
        "bigtiff": "IF_SAFER",
    }


def to_planscape(input_file: str) -> List[str]:
    log.info("Converting raster to planscape format.")
    layer_type, layer_info = get_layer_info(input_file=input_file)
    layer_crs = layer_info.get("crs")
    if layer_crs is None:
        raise ValueError(
            "Cannot convert to planscape format if raster file does not have CRS information."
        )
    log.info("Raster info available")
    _epsg, srid = layer_crs.split(":")
    warped_output = get_random_output_file(input_file=input_file)
    if int(srid) != settings.RASTER_CRS:
        warped_raster = warp(
            input_file=input_file,
            output_file=warped_output,
            crs=f"EPSG:{settings.RASTER_CRS}",
        )
    else:
        log.info("Raster DataLayer already has EPSG:3857 projection.")
        warped_raster = input_file

    is_valid, _errors, warnings = cog_validate(
        src_path=input_file,
        quiet=True,
    )
    if not is_valid:
        cog_output = get_random_output_file(input_file=warped_output)
        cog_raster = cog(input_file=warped_raster, output_file=cog_output)
    else:
        log.info(f"Raster DataLayer already is a COG. possible warnings: {warnings}")
        cog_raster = input_file

    return [cog_raster, warped_raster]


def cog(
    input_file: str,
    output_file: str,
    cog_profile: str = "deflate",
    profile_overrides: Optional[Dict[str, Any]] = None,
    **options,
) -> str:
    log.info("enabling cog")
    output_profile = cog_profiles.get(cog_profile)
    output_profile.update(dict(BIGTIFF="IF_SAFER"))
    if profile_overrides:
        output_profile.update(profile_overrides)

    # Dataset Open option (see gdalwarp `-oo` option)
    config = get_gdal_env()
    overview_level = options.pop("overview_level", 4) or 4

    cog_translate(
        input_file,
        output_file,
        output_profile,
        config=config,
        in_memory=False,
        quiet=True,
        web_optimized=True,
        overview_level=overview_level,
        **options,
    )

    return output_file


def warp(
    input_file: str,
    output_file: str,
    crs: str,
    num_threads: str = "ALL_CPUS",
    resampling_method: Resampling = Resampling.nearest,
) -> str:
    log.info(f"Warping raster {input_file}")
    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(input_file) as source:
            left, bottom, right, top = source.bounds
            transform, width, height = calculate_default_transform(
                src_crs=source.crs,
                dst_crs=crs,
                width=source.width,
                height=source.height,
                left=left,
                bottom=bottom,
                right=right,
                top=top,
            )
            output_profile = get_profile(
                input_profile=source.meta,
                crs=crs,
                transform=transform,
                width=width,  # type: ignore
                height=height,  # type: ignore
            )

            with rasterio.open(output_file, "w", **output_profile) as destination:
                for band in range(1, source.count + 1):
                    reproject(
                        source=rasterio.band(source, band),
                        destination=rasterio.band(destination, band),
                        src_transform=source.transform,
                        src_crs=source.crs,
                        dst_transform=transform,
                        dst_crs=crs,
                        resampling=resampling_method,
                    )
            return output_file


def to_cog_streaming(
    input_file: str,
    output_file: str,
    cog_profile: str = "deflate",
    overview_level: int = 4,
    in_memory: bool = False,
) -> str:
    """
    Convert a raster to Cloud Optimized GeoTIFF (COG) format using streaming.

    Uses rio-cogeo's streaming approach to minimize memory usage by processing
    the raster in blocks, not loading everything into memory.  Supports writing directly to cloud storage

    Args:
        input_file: Path to input raster file (local or cloud URL)
        output_file: Path for output COG file (local or cloud URL)
        cog_profile: COG profile to use (default: "deflate")
        overview_level: Pyramid overview level (default: 4)
        in_memory: Process in memory (default: False) - useful for small rasters

    Returns:
        Path/URL to the output COG file

    Example:
        >>> # Local file
        >>> cog_file = to_cog_streaming("/tmp/normalized.tif", "/tmp/output_cog.tif")
        >>>
        >>> # Direct to GCS
        >>> cog_url = to_cog_streaming("/tmp/normalized.tif", "gs://bucket/path/output.tif")
    """
    log.info(
        f"Converting raster to COG format (streaming): {input_file} -> {output_file}"
    )

    output_profile = cog_profiles.get(cog_profile)
    output_profile.update(dict(BIGTIFF="IF_SAFER"))

    config = get_gdal_env()

    cog_translate(
        input_file,
        output_file,
        output_profile,
        config=config,
        in_memory=in_memory,
        quiet=True,
        web_optimized=True,
        overview_level=overview_level,
    )

    log.info(f"COG conversion complete: {output_file}")
    return output_file


def to_planscape_streaming(input_file: str, output_file: str) -> str:
    """
    Memory-efficient version of to_planscape() that processes a single file.

    This function:
    1. Checks if the raster is in EPSG:3857 (Planscape CRS)
    2. Warps to EPSG:3857 if needed (streaming block-by-block)
    3. Validates if already COG format
    4. Converts to COG if needed (streaming, not in-memory)

    Use this when you want the same functionality as to_planscape() but with
    better memory efficiency and more control over output location.

    Args:
        input_file: Path to input raster file
        output_file: Path for final output COG file

    Returns:
        Path to the output COG file in EPSG:3857 format

    Example:
        >>> normalized = "/tmp/normalized.tif"
        >>> final = to_planscape_streaming(normalized, "/tmp/final_cog.tif")
    """
    from pathlib import Path
    import tempfile

    log.info(f"Converting raster to Planscape format (streaming): {input_file}")

    _, layer_info = get_layer_info(input_file=input_file)
    layer_crs = layer_info.get("crs")

    if layer_crs is None:
        raise ValueError(
            "Cannot convert to planscape format if raster file does not have CRS information."
        )

    _epsg, srid = layer_crs.split(":")
    target_crs = f"EPSG:{settings.RASTER_CRS}"

    if int(srid) != settings.RASTER_CRS:
        log.info(f"CRS conversion needed: {layer_crs} -> {target_crs}")
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
            warped_file = tmp.name

        warp(
            input_file=input_file,
            output_file=warped_file,
            crs=target_crs,
        )
        processing_file = warped_file
    else:
        log.info(f"Raster already in {target_crs}")
        processing_file = input_file
        warped_file = None

    is_valid, _errors, warnings = cog_validate(
        src_path=processing_file,
        quiet=True,
    )

    if not is_valid:
        log.info("Converting to COG format (not already COG)")
        to_cog_streaming(
            input_file=processing_file,
            output_file=output_file,
            in_memory=False,  # perf: could determine based on raster size
        )
    else:
        log.info(f"Already a valid COG. Warnings: {warnings}")
        if processing_file != output_file:
            import shutil

            shutil.copy2(processing_file, output_file)

    if warped_file:
        Path(warped_file).unlink(missing_ok=True)

    log.info(f"Planscape format conversion complete: {output_file}")
    return output_file


def data_mask(
    raster_path: str,
    connectivity: int = 8,
    min_area_pixels: int = 1000,
    simplify_tol_pixels=0,
    target_epsg: int = 4269,
) -> str | None:
    """
    Given a particular raster, returns it's datamask. The region with
    valid data, excluding nodata.
    The return is the polygon that composes all of this. INTENSIVE operation,
    takes a while to finish on large rasters.
    This does a sieve operation by default. Uses a lot of CPU with large rasters.
    A LOT.
    Polygon is returned in `target_epsg`
    """

    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(raster_path, "r") as ds:
            src_crs = ds.crs
            dst_crs = CRS.from_epsg(target_epsg)
            mask = ds.dataset_mask()  # uint8, shape (H, W)

            if not mask.any():
                return None

            valid = (mask != 0).astype(np.uint8)

            size = max(1, int(min_area_pixels))
            if size > 1:
                valid = sieve(valid, size=size, connectivity=connectivity)

            geoms = []
            for geom, val in shapes(
                valid,
                mask=valid,
                transform=ds.transform,
                connectivity=connectivity,
            ):
                if val == 1:
                    geoms.append(shape(geom))

            if not geoms:
                return None

            if simplify_tol_pixels and simplify_tol_pixels > 0:
                px = abs(ds.transform.a)
                py = abs(ds.transform.e)
                tol = max(px, py) * simplify_tol_pixels
                geoms = [g.simplify(tol, preserve_topology=True) for g in geoms]

            out_geom = unary_union(geoms)
            out_geom = make_valid(out_geom)
            if src_crs != dst_crs:
                out_geom = shape(
                    transform_geom(
                        src_crs,
                        dst_crs,
                        mapping(out_geom),
                        precision=6,
                    )
                )

            return json.dumps(mapping(out_geom))


def read_raster_window_downsampled(
    src: rasterio.DatasetReader,
    geometry: GEOSGeometry,
    geometry_crs: str = "EPSG:4269",
    target_pixels: Optional[int] = None,
    resampling: Resampling = Resampling.bilinear,
) -> Tuple[np.ndarray, np.ndarray, Any]:
    """
    Efficiently read a (optionally downsampled) window of raster data clipped to a geometry.

    This function avoids loading unnecessary data by using rasterio's windowed reading
    and optional out_shape parameter for downsampling.

    Args:
        src: Open rasterio dataset
        geometry: Geometry to clip to (Django GEOSGeometry or Shapely geometry)
        geometry_crs: CRS of the input geometry (default: EPSG:4269)
        target_pixels: Target number of pixels to read. If None, reads at full resolution.
                      Set to ~10M for statistical analysis. (default: None = full resolution)
        resampling: Resampling method when downsampling (default: bilinear)

    Returns:
        Tuple of (data_array, valid_mask, transform) where:
            - data_array: Raster values as numpy array
            - valid_mask: Boolean mask indicating valid pixels (within geometry and not nodata)
            - transform: Affine transform for the output array

    Example (downsampled for statistics):
        >>> with rasterio.open('large_raster.tif') as src:
        >>>     data, mask, transform = read_raster_window_downsampled(
        >>>         src, planning_area_geometry, target_pixels=10_000_000
        >>>     )
        >>>     valid_values = data[mask]
        >>>     print(f"Mean: {np.mean(valid_values)}")

    Example (full resolution for clipping):
        >>> with rasterio.open('large_raster.tif') as src:
        >>>     data, mask, transform = read_raster_window_downsampled(
        >>>         src, planning_area_geometry, target_pixels=None
        >>>     )
        >>>     data[~mask] = src.nodata  # Mask outside pixels
    """
    nodata = src.nodata

    # convert Django GEOSGeometry to Shapely if needed
    if hasattr(geometry, "geom_type") and hasattr(geometry, "coords"):
        geom_geojson = {
            "type": geometry.geom_type,
            "coordinates": geometry.coords,
        }
        geom_shape = shape(geom_geojson)
    else:
        geom_shape = geometry
        geom_geojson = mapping(geom_shape)

    if src.crs and src.crs.to_string() != geometry_crs:
        geom_geojson = transform_geom(
            src_crs=geometry_crs,
            dst_crs=src.crs,
            geom=geom_geojson,
        )
        geom_shape = shape(geom_geojson)

    minx, miny, maxx, maxy = geom_shape.bounds
    window = src.window(minx, miny, maxx, maxy)

    window_width = int(window.width)
    window_height = int(window.height)
    total_pixels = window_width * window_height

    if total_pixels == 0:
        raise ValueError("Geometry does not intersect with raster")

    if target_pixels is None:
        out_height = window_height
        out_width = window_width
    else:
        downsample_factor = max(1, int(np.sqrt(total_pixels / target_pixels)))
        out_height = max(1, window_height // downsample_factor)
        out_width = max(1, window_width // downsample_factor)

    data = src.read(
        1,
        window=window,
        out_shape=(out_height, out_width),
        resampling=resampling,
    )

    output_transform = from_bounds(minx, miny, maxx, maxy, out_width, out_height)

    geom_mask = geometry_mask(
        [geom_geojson],
        out_shape=(out_height, out_width),
        transform=output_transform,
        invert=True,  # inside geometry
    )

    if nodata is not None:
        valid_mask = (data != nodata) & geom_mask
    else:
        valid_mask = ~np.isnan(data) & geom_mask

    return data, valid_mask, output_transform
