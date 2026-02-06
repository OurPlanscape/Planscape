import os
import subprocess
from pathlib import Path
from typing import Any, Collection, Dict, Optional

import requests
import toml
from django.conf import settings
from gis.core import with_vsi_prefix
from requests.exceptions import HTTPError, RequestException, Timeout

from planscape.exceptions import ForsysException, ForsysTimeoutException


def ogr2ogr_cli(
    input_file: str,
    schema_name: str,
    table_name: str,
    input_layer_name: Optional[str] = None,
    output_layer_name: Optional[str] = None,
    destination_srs: str = "EPSG:4269",
    database: Optional[Dict[str, Any]] = None,  # type: ignore
) -> Collection[str]:
    if database is None:
        database: Dict[str, Any] = settings.DATABASES["default"]

    host = database.get("HOST")
    user = database.get("USER")
    dbname = database.get("NAME")
    password = database.get("PASSWORD")
    port = database.get("PORT")
    conn = f"PG:host={host} user={user} dbname={dbname} password={password} port={port}"

    input_file = with_vsi_prefix(input_file)

    args = [
        "ogr2ogr",
        "-f",
        "PostgreSQL",
        "-nln",
        table_name,
        "-nlt",
        "PROMOTE_TO_MULTI",
        "-nlt",
        "CONVERT_TO_LINEAR",
        "-dim",
        "XY",
        "-t_srs",
        destination_srs,
        "-unsetFid",
        "-makevalid",
        # not yet supported by our version of GDAL
        # "-emptyStrAsNull",
        "-lco",
        f"SCHEMA={schema_name}",
        "-lco",
        "LAUNDER=YES",
        "-lco",
        "GEOMETRY_NAME=geometry",
        "-lco",
        "FID=id",
        "-lco",
        "FID64=TRUE",
        "-lco",
        "precision=NO",
        "-lco",
        "SPATIAL_INDEX=GIST",
        conn,
        input_file,
    ]
    return args


def ogr2ogr_extract_layer_from_gpkg_to_shp(
    input_file: str,
    output_file: str,
    layer: str,
) -> Collection[str]:
    """Transforms the input file to the target CRS using ogr2ogr.

    :param input_file: Path to the input file.
    :param output_file: Path to the output file.
    :param layer: Layer name to extract.
    :return: OGR2OGR command as a list of strings.
    """
    args = [
        "ogr2ogr",
        "-of",
        "ESRI Shapefile",
        "-overwrite",
        output_file,
        input_file,
        layer,
    ]
    return args


def options_from_file() -> Dict[str, Any]:
    """This method reads from a standard .planconfig file
    located at the root of the project to gather details
    for CLI executions.
    """
    repo_root = Path.cwd().parent.parent
    config_file = repo_root / ".planconfig"
    if not config_file.exists():
        return {}

    with open(str(config_file), "r") as f:
        config = toml.load(f)
        return config["planscape"]


def raster2pgpsql(
    raster_path,
    output_table,
    tile_size,
    srid,
    name_column="name",
    raster_column="raster",
):
    return [
        "raster2pgsql",
        "-s",
        str(srid),
        "-a",
        "-F",
        "-f",
        raster_column,
        "-n",
        name_column,
        "-t",
        tile_size,
        str(raster_path),
        output_table,
    ]


def psql(username, database, host, port):
    return [
        "psql",
        "-U",
        username,
        "-h",
        host,
        "-p",
        str(port),
        "-d",
        database,
    ]


def psql_pipe(command, head_stdin, env=None):
    """This function chain the output
    from `head_stdin` into a `psql`
    pipe, processing any data that comes
    from it.

    `head_stdin` usually will be the
    `stdout` from another subprocess.

    This is a BLOCKING operation.
    """
    environment = os.environ.copy()
    if env:
        environment = {**environment, **env}
    return subprocess.check_output(command, stdin=head_stdin, env=environment)


def get_forsys_call(scenario_id):
    return [
        "Rscript",
        str(settings.FORSYS_PATCHMAX_SCRIPT),
        "--scenario",
        str(scenario_id),
    ]


def _call_forsys_via_command_line(
    scenario_id: int,
    env: Optional[Dict[str, str]] = None,
    check: bool = True,
    timeout: Optional[int] = None,
) -> subprocess.CompletedProcess:
    """Call the forsys command line tool."""
    environment = os.environ.copy()
    if env:
        environment = {**environment, **env}
    forsys_call = get_forsys_call(scenario_id)
    try:
        return subprocess.run(
            forsys_call,
            env=env,
            check=check,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as e:
        raise ForsysTimeoutException(
            f"Forsys command line call timed out after {timeout} seconds."
        ) from e
    except subprocess.CalledProcessError or OSError as e:
        raise ForsysException(f"Forsys command line call failed: {e}") from e


def _call_forsys_via_api(
    scenario_id: int,
    timeout: Optional[int] = None,
):
    """Call the forsys API."""
    try:
        response = requests.post(
            f"{settings.FORSYS_PLUMBER_URL}/run_forsys",
            json={"scenario_id": scenario_id},
            timeout=timeout or settings.FORSYS_PLUMBER_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()
    except Timeout as e:
        raise ForsysTimeoutException(
            f"Forsys API call timed out after {timeout} seconds."
        ) from e
    except HTTPError or RequestException as e:
        raise ForsysException(f"Forsys API call failed: {e}") from e


def call_forsys(scenario_id, env=None, check=True, timeout=None):
    return _call_forsys_via_api(scenario_id, timeout)
