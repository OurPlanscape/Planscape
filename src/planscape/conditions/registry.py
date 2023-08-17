from pathlib import Path
import subprocess
from django.conf import settings
from conditions.models import Condition, ConditionRaster
from utils.cli import psql, psql_pipe, raster2pgpsql

def get_raster_path(condition):
    base = Path(settings.RASTER_ROOT)
    return base / condition.raster_name


def register_condition_raster(
        condition: Condition,
        clear: bool = True,
        tile_size : str = settings.RASTER_TILE,
        srid:int = settings.CRS_FOR_RASTERS,
    ):
    """
    Given an existing condition, register the raster associated with it in the database.
    """

    raster_path = get_raster_path(condition)
    if not raster_path.exists():
        return (False, f"raster for condition {condition.pk} does not exist on disk")
    try:
        
        if clear:
            ConditionRaster.objects.filter(name=raster_path.name).delete()

        raster_command = raster2pgpsql(raster_path, "public.conditions_conditionraster", tile_size, srid)
        raster_process = subprocess.Popen(raster_command, stdout=subprocess.PIPE)
        psql_command = psql(
            settings.PLANSCAPE_DATABASE_USER,
            settings.PLANSCAPE_DATABASE_NAME,
            settings.PLANSCAPE_DATABASE_HOST,
            settings.PLANSCAPE_DATABASE_PORT,
        )
        _psql = psql_pipe(psql_command, raster_process.stdout, settings.PLANSCAPE_DATABASE_PASSWORD)
        raster_process.wait()
        if raster_process.returncode == 0:
            new_name = f"condition-{str(condition.pk).zfill(4)}"
            ConditionRaster.objects.filter(name=raster_path.name).update(name=new_name)

            return (True, "success")
        
        return (False, "failed, unknow cause.")
    except Exception as ex:
        print(ex)
        breakpoint()
        return (False, f"failed {str(ex)}")