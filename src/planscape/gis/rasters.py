import logging
from typing import Any, Dict, List, Optional, Union

import rasterio
from django.conf import settings
from rasterio.warp import Resampling, calculate_default_transform, reproject
from rio_cogeo.cogeo import cog_translate, cog_validate
from rio_cogeo.profiles import cog_profiles

from gis.core import get_layer_info, get_random_output_file
from gis.info import get_gdal_env

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
    if int(srid) != settings.CRS_FOR_RASTERS:
        warped_output = get_random_output_file(input_file=input_file)

        warped_raster = warp(
            input_file=input_file,
            output_file=warped_output,
            crs=f"EPSG:{settings.CRS_FOR_RASTERS}",
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
