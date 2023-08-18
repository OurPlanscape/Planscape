import os
import subprocess


def raster2pgpsql(raster_path, output_table, tile_size, srid, name_column="name", raster_column = "raster"):
    return [
        "raster2pgsql",
        "-s", str(srid),
        "-a",
        "-R",
        "-F",
        "-f", raster_column,
        "-n", name_column,
        "-t", tile_size,
        str(raster_path),
        output_table,
    ]

def psql(username, database, host, port):
    return [
        "psql",
        "-U", username,
        "-h", host,
        "-p", str(port),
        "-d", database,
    ]

def psql_pipe(command, stdin, password):
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    return subprocess.check_output(command, stdin=stdin, env=env)