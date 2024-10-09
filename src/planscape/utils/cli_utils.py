import os
import subprocess
from pathlib import Path
from typing import Any, Dict

import toml
from django.conf import settings


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


def call_forsys(scenario_id, env=None, check=True, timeout=None):
    environment = os.environ.copy()
    if env:
        environment = {**environment, **env}
    forsys_call = get_forsys_call(scenario_id)
    return subprocess.run(
        forsys_call,
        env=env,
        check=check,
        timeout=timeout,
    )
