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


def merge_layers(
    input_file: str,
    layer_info: dict,
    target_layers: Optional[list] = None,
) -> str:
    """Converts GeoPackage to a Shapefile and filter the input file to only include the target layers.

    :param input_file: Path to the input GeoPackage file.
    :param output_file: Path to the output Shapefile file.
    :param target_layers: List of layer names to filter. If None, all layers are included.
    :return: Path to the output Shapefile file.
    """
    if not target_layers:
        return input_file

    schema = {}
    crs = None
    for layer in layer_info.values():
        layer_schema = layer.get("schema", {})

        if schema.get("properties") is None:
            schema["properties"] = layer_schema.get("properties")
        else:
            geometry = {**schema["properties"], **layer_schema.get("properties", {})}
            schema["properties"] = geometry

        if schema.get("geometry") is None:
            schema["geometry"] = layer_schema.get("geometry")
        elif schema.get("geometry") is not None and schema.get(
            "geometry"
        ) != layer_schema.get("geometry"):
            print(
                f"Schema geometry: {schema.get('geometry')}, Layer geometry: {layer_schema.get('geometry')}"
            )
            raise VectorError(
                "Cannot merge layers with different geometry types in the same file."
            )

        if crs is None:
            crs = layer.get("crs")
        elif crs != layer.get("crs"):
            raise VectorError(
                "Cannot filter layers with different CRS in the same file."
            )

    print(f"Schema: {schema}")
    print(f"CRS: {crs}")

    output_file = get_random_output_file(input_file=input_file)
    try:
        with fiona.open(
            output_file,
            "w",
            driver="ESRI Shapefile",
            schema=schema,
            crs=crs,
        ) as sink:
            # Open the output shapefile with the same schema and driver

            for layer in target_layers:
                with fiona.open(input_file, "r", layer=layer) as source:
                    # Get the schema (data structure) of the source
                    print(f"Processing layer: {layer}")

                    # Write each feature from source to the sink shapefile
                    print(f"Writing features to {output_file}")
                    for feature in source:
                        sink.write(feature)
    except DriverError as e:
        log.error(f"Error processing input file {input_file}: {e}")
        raise VectorError(f"Failed to filter layers: {e}") from e

    return output_file


def to_planscape(
    input_file: str, target_layers: Optional[list] = None
) -> Tuple[Collection[str], dict]:
    """Given a input_file, process it and
    turn it into a list of processed files that meet
    planscape's needs.

    :param input_file: _description_
    :type input_file: str
    :param target_layers: _description_, defaults to None
    :type target_layers: Optional[list]
    :return: _description_
    :rtype: Tuple[Collection[str], dict]
    """

    log.info("Converting vector to planscape format.")

    layer_type, layer_info = get_layer_info(input_file=input_file)

    is_multi_layer = isinstance(layer_info, dict) and len(layer_info.keys()) > 1

    if is_multi_layer:
        for layer_name, layer in layer_info.items():
            layer_crs = layer.get("crs")
            if layer_crs is None:
                raise ValueError(
                    f"Cannot convert to planscape format if raster file does not have CRS information on layer {layer_name}."
                )
    else:
        layer_crs = layer_info.get("crs")
        if layer_crs is None:
            raise ValueError(
                "Cannot convert to planscape format if raster file does not have CRS information."
            )
    log.info("Raster info available")

    is_valid, errors, _warnings = vector_validate(input_file=input_file)
    if not is_valid:
        raise VectorError(
            "Vector file is not valid. Errors: %s" % errors,
        )

    merged_vector = input_file
    if is_multi_layer:
        target_layers = target_layers if target_layers else list(layer_info.keys())
        if not target_layers:
            raise VectorError(
                "Cannot convert multi-layer vector file without specifying target layers."
            )
        print(f"Merging layers: {target_layers}")
        if not set(target_layers).issubset(set(layer_info.keys())):
            raise VectorError(
                f"Target layers {target_layers} not found in the input file {input_file}."
            )
        merged_vector = merge_layers(
            input_file=input_file,
            layer_info=layer_info,
            target_layers=target_layers,
        )

    layer_type, layer_info = get_layer_info(input_file=merged_vector)
    print(f"Layer info: {layer_info}")

    return [merged_vector], layer_info
