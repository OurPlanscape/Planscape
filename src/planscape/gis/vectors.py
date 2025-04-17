import logging
import os
import subprocess
from typing import Collection, Optional, Tuple
from uuid import uuid4

from django.conf import settings
from utils.cli_utils import ogr2ogr_cli

from gis.core import get_layer_info, get_random_output_file
from gis.exceptions import VectorError

log = logging.getLogger(__name__)


def vector_validate(input_file: str) -> Tuple[bool, Collection[str], Collection[str]]:
    return True, [], []


def ogr2ogr(input_file: str, organization_id: Optional[int] = None):
    environment = os.environ.copy()
    # fix this
    table_name = str(uuid4()).replace("-", "")
    ogr2ogr_call = ogr2ogr_cli(
        input_file,
        "datastore",
        table_name=table_name,
    )
    return subprocess.run(
        ogr2ogr_call,  # type: ignore
        check=True,
        env=environment,
        timeout=settings.OGR2OGR_TIMEOUT,
    )


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
