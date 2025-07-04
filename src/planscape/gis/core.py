import logging
from django.conf import settings
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

import fiona
import rasterio
from core.s3 import get_bucket_and_key, is_s3_file, get_aws_session
from core.gcs import (
    is_gcs_file,
    get_bucket_and_key as get_gcs_bucket_and_key,
    get_gcs_session,
)
from datasets.models import DataLayerType, GeometryType
from fiona.errors import DriverError
from rasterio.session import Session, AWSSession
from rasterio.errors import RasterioIOError

from gis.errors import InvalidFileFormat, InvalidGeometryType
from gis.info import get_gdal_env

log = logging.getLogger(__name__)


def with_vsi_prefix(input_file: str) -> str:
    if is_s3_file(input_file):
        bucket, key = get_bucket_and_key(input_file)
        input_file = f"/vsis3/{bucket}/{key}"
    elif is_gcs_file(input_file):
        bucket, key = get_gcs_bucket_and_key(input_file)
        input_file = f"/vsigs/{bucket}/{key}"
    if input_file.endswith(".zip"):
        input_file = f"/vsizip/{input_file}"
    return input_file


def get_random_output_file(input_file: str, output_folder: str = "/tmp") -> str:
    """Returns a random outputfile with the same
    extension as the input.
    """
    input_path = Path(input_file)
    output_path = Path(output_folder) / str(uuid4())
    return str(output_path.with_suffix(input_path.suffix))


@lru_cache
def is_vector(input_file: str) -> bool:
    try:
        path_file = Path(input_file)
        extension = path_file.suffix.lower()
        with fiona.Env(**get_gdal_env(allowed_extensions=extension)):
            with fiona.open(input_file):
                return True
    except DriverError:
        return False


@lru_cache
def is_raster(input_file: str) -> bool:
    try:
        path_file = Path(input_file)
        extension = path_file.suffix.lower()
        with rasterio.Env(**get_gdal_env(allowed_extensions=extension)):
            with rasterio.open(input_file):
                return True
    except RasterioIOError:
        return False


@lru_cache
def fetch_datalayer_type(input_file: str) -> DataLayerType:
    if is_raster(input_file):
        return DataLayerType.RASTER

    if is_vector(input_file):
        return DataLayerType.VECTOR

    raise InvalidFileFormat(f"The {input_file} is not a valid vector or raster.")


def fetch_geometry_type(
    layer_type: DataLayerType,
    info: Dict[str, Any],
    layer: Optional[str] = None,
) -> GeometryType:
    if layer_type == DataLayerType.RASTER:
        return GeometryType.RASTER

    layers = list(info.keys())
    layer_info = {}
    if layer:
        layer_info = info[layer]
    elif len(layers) == 1:
        layer_info = info[layers[0]]
    elif "geometry" in info:
        layer_info = info
    geometry_type = layer_info.get("schema", {}).get("geometry", "") or ""
    if not geometry_type:
        raise InvalidGeometryType("Could not determine geometry type")
    return GeometryType[geometry_type.upper()]


@lru_cache
def get_layer_info(input_file: str) -> Tuple[DataLayerType, Dict[str, Any]]:
    from gis.info import info_raster, info_vector

    layer_type = fetch_datalayer_type(input_file)
    fn = info_raster if layer_type == DataLayerType.RASTER else info_vector
    return layer_type, fn(input_file=input_file)


def get_storage_session() -> Session:
    """
    Returns a rasterio session configured for the storage backend.
    This session is used for reading and writing raster data.

    Returns:
        Session: A rasterio session for the configured storage backend.
    """
    match settings.PROVIDER:
        case "aws":
            return AWSSession(get_aws_session())
        case "gcp":
            return get_gcs_session()
        case _:
            raise ValueError(f"Unsupported storage provider: {settings.PROVIDER}")
