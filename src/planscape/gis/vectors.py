import logging
import os
import subprocess
from typing import Collection, Tuple, Optional
from uuid import uuid4

from django.conf import settings
from utils.cli_utils import ogr2ogr_cli

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


def warp(input_file: str, output_file: str, in_crs: str, out_crs: str) -> str:
    """Reprojects a vector file from one CRS to another using Fiona and pyproj.

    :param input_file: Path to the input vector file.
    :param output_file: Path to the output vector file.
    :param in_crs: EPSG code of the input CRS (e.g., "4326").
    :param out_crs: EPSG code of the output CRS (e.g., "3857").
    :return: Path to the reprojected output file.
    :raises VectorError: If the input file cannot be opened or if the CRS transformation fails.
    """
    source_crs = CRS.from_epsg(in_crs)
    target_crs = CRS.from_epsg(out_crs)

    with fiona.open(input_file, "r") as source:
        output_schema = source.schema.copy()
        with fiona.open(
            output_file,
            "w",
            driver=source.driver,
            schema=output_schema,
            crs=target_crs.to_wkt(),
        ) as sink:
            for feature in source:
                reprojected_geometry = transform_geom(
                    source_crs, target_crs, shape(feature["geometry"])
                )
                sink.write(
                    {
                        "properties": feature["properties"],
                        "geometry": mapping(reprojected_geometry),
                    }
                )
    return output_file


def filter_layers(
    input_file: str, output_file: str, target_layers: Optional[list] = None
) -> str:
    """Converts GeoPackage to a Shapefile and filter the input file to only include the target layers.

    :param input_file: Path to the input GeoPackage file.
    :param output_file: Path to the output Shapefile file.
    :param target_layers: List of layer names to filter. If None, all layers are included.
    :return: Path to the output Shapefile file.
    """
    if not target_layers:
        return input_file

    for layer in target_layers:
        try:
            with fiona.open(input_file, "r", layer=layer) as source:
                # Get the schema (data structure) of the source
                schema = source.schema.copy()  # type: ignore

                # Open the output shapefile with the same schema and driver
                with fiona.open(
                    output_file,
                    "w",
                    driver="ESRI Shapefile",
                    schema=schema,
                    crs=source.crs,
                ) as sink:
                    # Write each feature from source to the sink shapefile
                    for feature in source:
                        sink.write(feature)
        except DriverError as e:
            log.error(f"Error processing input file {input_file}: {e}")
            raise VectorError(f"Failed to filter layers: {e}") from e

    return output_file


def to_planscape(
    input_file: str, target_layers: Optional[list] = None
) -> Collection[str]:
    """Given a input_file, process it and
    turn it into a list of processed files that meet
    planscape's needs.

    :param input_file: _description_
    :type input_file: str
    :param target_layers: _description_, defaults to None
    :type target_layers: Optional[list]
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
        warped_vector = warp(
            input_file=input_file,
            output_file=warped_vector,
            in_crs=srid,
            out_crs=settings.DEFAULT_CRS,
        )
    else:
        log.info("Raster DataLayer already has EPSG:3857 projection.")
        warped_vector = input_file
    is_valid, errors, _warnings = vector_validate(warped_vector)
    if not is_valid:
        raise VectorError(
            "Vector file is not valid. Errors: %s" % errors,
        )

    if target_layers:
        if not target_layers in layer_info.get("layers", []):
            raise VectorError(
                f"Target layers {target_layers} not found in the input file {input_file}."
            )
        filtered_vector = get_random_output_file(input_file=warped_vector)
        warped_vector = filter_layers(
            input_file=warped_vector,
            output_file=filtered_vector,
            target_layers=target_layers,
        )

    return [warped_vector]
