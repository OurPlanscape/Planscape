import logging
from typing import Any, Dict, Optional
import rasterio
import fiona
from rasterio.errors import RasterioIOError
from fiona.errors import DriverError
from datasets.models import DataLayerType, GeometryType
from gis.errors import InvalidFileFormat, InvalidGeometryType

log = logging.getLogger(__name__)


def is_vector(input_file: str) -> bool:
    try:
        with fiona.open(input_file):
            return True
    except DriverError:
        return False


def is_raster(input_file: str) -> bool:
    try:
        with rasterio.open(input_file):
            return True
    except RasterioIOError:
        return False


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
        raise InvalidGeometryType(f"Could not determine geometry type")
    return GeometryType[geometry_type.upper()]