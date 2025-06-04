import logging
import os
import subprocess
from pathlib import Path
from typing import Collection, Tuple, Optional
from uuid import uuid4

from django.conf import settings
from utils.cli_utils import ogr2ogr_cli, ogr2ogr_extract_layer_from_gpkg_to_shp

from gis.core import get_layer_info, get_random_output_file
from gis.exceptions import VectorError
from pyproj import CRS
import fiona
from fiona.transform import transform_geom
from fiona.errors import DriverError
from shapely.geometry import shape, mapping

log = logging.getLogger(__name__)


def vector_validate(input_file: str) -> Tuple[bool, Collection[str], Collection[str]]:
    return True, [], []


def ogr2ogr(input_file: str) -> str:
    environment = os.environ.copy()
    # fix this
    table_name = str(uuid4()).replace("-", "")
    ogr2ogr_call = ogr2ogr_cli(
        input_file,
        "datastore",
        table_name=table_name,
    )
    _execution = subprocess.run(
        ogr2ogr_call,  # type: ignore
        check=True,
        env=environment,
        timeout=settings.OGR2OGR_TIMEOUT,
    )
    return f"datastore.{table_name}"


def extract_layer(
    input_file: str,
    layer: str,
) -> str:
    """Transforms the input file to the target CRS using ogr2ogr.

    :param input_file: Path to the input file.
    :param target_crs: Target CRS in EPSG format (e.g., "EPSG:4326").
    :return: Path to the transformed output file.
    """
    environment = os.environ.copy()
    output_file = get_random_output_file(input_file=input_file)
    output_file = str(Path(output_file).with_suffix(".shp"))

    ogr2ogr_call = ogr2ogr_extract_layer_from_gpkg_to_shp(
        input_file,
        output_file,
        layer=layer,
    )
    _execution = subprocess.run(
        ogr2ogr_call,  # type: ignore
        check=True,
        env=environment,
        timeout=settings.OGR2OGR_TIMEOUT,
    )
    return output_file


def zip_shapefile(input_file: str) -> str:
    """Zips the shapefile and returns the path to the zip file.

    :param input_file: Path to the input file.
    :return: Path to the zipped shapefile.
    """
    files_to_compress = [
        str(Path(input_file).with_suffix(suffix))
        for suffix in [".shp", ".shx", ".dbf", ".prj"]
    ]
    output_file = str(Path(input_file).with_suffix(".zip"))

    subprocess.run(
        ["zip", "-j", output_file, *(file for file in files_to_compress)],
        check=True,
        timeout=settings.ZIP_TIMEOUT,
    )
    return output_file


def to_planscape(input_file: str) -> Collection[str]:
    """Given a input_file, process it and
    turn it into a list of processed files that meet
    planscape's needs.

    :param input_file: _description_
    :type input_file: str
    :return: _description_
    :rtype: Collection[str]
    """
    log.info("Converting vector to planscape format.")
    layer_type, layer_info = get_layer_info(input_file=input_file)
    layer_crs = layer_info.get("crs")
    if layer_crs is None:
        raise ValueError(
            "Cannot convert to planscape format if raster file does not have CRS information."
        )
    log.info("Raster info available")
    _epsg, srid = layer_crs.split(":")
    if int(srid) != settings.DEFAULT_CRS:
        warped_vector = get_random_output_file(input_file=input_file)
        # warp here
    else:
        log.info("Raster DataLayer already has EPSG:3857 projection.")
        warped_vector = input_file

    is_valid, errors, _warnings = vector_validate(warped_vector)
    if not is_valid:
        raise VectorError(
            "Vector file is not valid. Errors: %s" % errors,
        )

    return [warped_vector]


def to_planscape_multi_layer(
    input_file: str,
    all_layers: Optional[bool] = False,
    target_layers: Optional[list] = None,
) -> Collection[Tuple[str, str]]:
    """Given a input_file, process it and
    turn it into a list of processed files that meet
    planscape's needs.

    :param input_file: _description_
    :type input_file: str
    :param target_layers: _description_, defaults to None
    :type target_layers: Optional[list]
    :return: _description_
    :rtype: Collection[Tuple[str, str]
    """
    layer_type, layer_info = get_layer_info(input_file=input_file)

    if len(layer_info.keys()) <= 1:
        raise ValueError(
            "Input file is not a multi-layer vector file. Use to_planscape instead."
        )

    if all((all_layers, target_layers)) or not any((all_layers, target_layers)):
        raise ValueError(
            "Cannot specify both or none all_layers and target_layers. Please choose one."
        )

    if all_layers:
        # If all_layers is True, we will use all layers from the input file
        target_layers = list(layer_info.keys())

    output_files = []

    print(f"Alll layers: {all_layers}")
    print(f"Target layers: {target_layers}")
    for layer in target_layers:
        output_file = extract_layer(
            input_file=input_file,
            layer=layer,
        )
        output_file = zip_shapefile(output_file)
        output_files.append((layer, output_file))

    return output_files
