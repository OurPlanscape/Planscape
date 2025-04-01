import json
import logging
from typing import Any, Dict, Optional, Union

import fiona
import rasterio
from attr import asdict
from core.s3 import get_aws_session
from django.conf import settings
from fiona.errors import DriverError
from rasterio.transform import from_gcps

logger = logging.getLogger(__name__)


def get_gdal_env(num_threads: Union[int, str] = "ALL_CPUS") -> Dict[str, Any]:
    return {
        "session": get_aws_session(),
        "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
        "CPL_VSIL_USE_TEMP_FILE_FOR_RANDOM_WRITE": "YES",
        "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif",
        "GDAL_CACHE_MAX": settings.GDAL_CACHE_MAX,
        "VSI_CACHE": False,
        "GDAL_NUM_THREADS": str(num_threads),
        "GDAL_TIFF_INTERNAL_MASK": True,
        "GDAL_TIFF_OVR_BLOCK_SIZE": 128,
    }


def info_raster(input_file: str) -> Dict[str, Any]:
    """z
    This copies the original rasterio info CLI util with some changes, so we can call this
    from our code.
    """
    with rasterio.Env(**get_gdal_env()):
        with rasterio.open(input_file) as src:
            info = dict(src.profile)
            info["shape"] = (info["height"], info["width"])
            info["bounds"] = src.bounds

            if src.crs:
                epsg = src.crs.to_epsg()
                if epsg:
                    info["crs"] = f"EPSG:{epsg}"
                else:
                    info["crs"] = src.crs.to_string()
            else:
                info["crs"] = None

            info["res"] = src.res
            info["colorinterp"] = [ci.name for ci in src.colorinterp]
            info["units"] = [units or None for units in src.units]
            info["descriptions"] = src.descriptions
            info["indexes"] = src.indexes
            info["mask_flags"] = [
                [flag.name for flag in flags] for flags in src.mask_flag_enums
            ]

            if src.crs:
                info["lnglat"] = src.lnglat()

            gcps, gcps_crs = src.gcps

            if gcps:
                info["gcps"] = {"points": [p.asdict() for p in gcps]}
                if gcps_crs:
                    epsg = gcps_crs.to_epsg()
                    if epsg:
                        info["gcps"]["crs"] = f"EPSG:{epsg}"
                    else:
                        info["gcps"]["crs"] = src.crs.to_string()
                else:
                    info["gcps"]["crs"] = None

                info["gcps"]["transform"] = from_gcps(gcps)

            stats = [asdict(so) for so in src.stats()]
            info["stats"] = stats
            info["checksum"] = [src.checksum(i) for i in src.indexes]

            return json.loads(json.dumps(info))


def info_vector_layer(input_file: str, layer: Optional[str] = None) -> Dict[str, Any]:
    with fiona.open(input_file, layer=layer) as src:
        info = src.meta
        info.update(name=src.name)

        try:
            info.update(bounds=src.bounds)
        except DriverError:
            info.update(bounds=None)
            logger.debug(
                "Setting 'bounds' to None - driver was not able to calculate bounds"
            )

        try:
            info.update(count=len(src))
        except TypeError:
            info.update(count=None)
            logger.debug(
                "Setting 'count' to None/null - layer does not support counting"
            )

        info["crs"] = src.crs.to_string()
        return json.loads(json.dumps(info))


def info_vector(input_file: str) -> Dict[str, Any]:
    """
    Print information about a dataset.

    When working with a multi-layer dataset the first layer is used by default.
    Use the '--layer' option to select a different layer.

    """
    layers = fiona.listlayers(input_file)
    info = {
        layer: info_vector_layer(input_file=input_file, layer=layer) for layer in layers
    }
    return info
