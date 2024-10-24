import logging
from typing import Any, Dict, Optional
import rasterio
import fiona
from rasterio.errors import RasterioIOError
from fiona.errors import DriverError
from datasets.models import DataLayerType, GeometryType
from gis.errors import InvalidFileFormat, InvalidGeometryType
from gis.info import info_raster, info_vector


log = logging.getLogger(__name__)


def get_layer_info(input_file: str) -> Dict[str, Any]:
    layer_type = fetch_datalayer_type(input_file)
    fn = info_raster if layer_type == DataLayerType.RASTER else info_vector
    return fn(input_file=input_file)


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


def get_layer_info(input_file: str) -> Dict[str, Any]:
    from gis.info import info_raster, info_vector

    layer_type = fetch_datalayer_type(input_file)
    fn = info_raster if layer_type == DataLayerType.RASTER else info_vector
    return fn(input_file=input_file)
