import os
from pathlib import Path
import subprocess
from django.conf import settings
from conditions.models import Condition, ConditionRaster
from base.condition_types import ConditionScoreType
from utils.cli_utils import psql, psql_pipe, raster2pgpsql


def get_raster_path(condition):
    base = Path(settings.RASTER_ROOT)
    return base / condition.raster_name


def get_tile_name(condition):
    """
    Tile is a concept of PostGIS raster.
    It represents a part of a larger raster
    stored in the raster table.

    This function will return a formatted, human
    readable name for a tile.

    All tiles that belong to the a raster will
    have the same name.
    """
    base_cond = condition.condition_dataset
    score_type = ConditionScoreType(condition.condition_score_type).name
    raw = "raw" if condition.is_raw else "normalized"
    return (
        f"{base_cond.region_name}:{base_cond.condition_name}_{score_type}_{raw}".lower()
    )


def register_condition_raster(
    condition: Condition,
    clear: bool = True,
    tile_size: str = settings.RASTER_TILE,
    srid: int = settings.CRS_FOR_RASTERS,
):
    """
    Given an existing condition, register the raster associated with it in the database.
    """

    raster_path = get_raster_path(condition)
    tile_name = get_tile_name(condition)
    if not raster_path.exists():
        return (
            False,
            f"raster for condition {condition.pk} does not exist on disk",
        )
    try:
        if clear:
            condition.raster_tiles.all().delete()

        environment = os.environ.copy()
        environment = {**environment, **{"GDAL_NUM_THREADS": "8"}}

        raster_command = raster2pgpsql(
            raster_path, "public.conditions_conditionraster", tile_size, srid
        )
        raster_process = subprocess.Popen(
            raster_command,
            stdout=subprocess.PIPE,
            env=environment,
        )
        psql_command = psql(
            settings.PLANSCAPE_DATABASE_USER,
            settings.PLANSCAPE_DATABASE_NAME,
            settings.PLANSCAPE_DATABASE_HOST,
            settings.PLANSCAPE_DATABASE_PORT,
        )

        _psql_command_output = psql_pipe(
            psql_command,
            raster_process.stdout,
            env={"PGPASSWORD": settings.PLANSCAPE_DATABASE_PASSWORD},
        )
        raster_process.wait()
        if raster_process.returncode == 0:
            ConditionRaster.objects.filter(condition_id__isnull=True).update(
                name=tile_name, condition_id=condition.pk
            )

            return (True, "success")

        return (False, "failed, unknown cause.")
    except Exception as ex:
        return (False, f"failed {str(ex)}")
