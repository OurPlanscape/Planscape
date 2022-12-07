import os
from decouple import config
from typing import cast

from base.condition_types import ConditionLevel, ConditionScoreType
from config.conditions_config import PillarConfig
from .models import BaseCondition, Condition
from base.conditions import *
from eval.compute_conditions import *
import subprocess

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))

"""
To run this script run the following commands"

1) In your terminal window
    python manage.py shell
2) In the python interactive shell
    from conditions import load
    load.load_metrics('sierra_cascade_inyo')
"""


def load_metrics(region: str):
    """Loads the metric rasters defined by the configuration into the database if display=true."""
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'Planscape/src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        if pillar['display']:
            for element in config.get_elements(pillar):
                for metric in config.get_metrics(element):
                    query = BaseCondition.objects.filter(
                        condition_name=metric['metric_name'])
                    if len(query) > 0:
                        print("BaseCondition " +
                              metric['metric_name'] + " already exists; deleting.")
                        query.delete()

                    base_metric = BaseCondition(
                        condition_name=metric['metric_name'], condition_level=ConditionLevel.METRIC, region_name=region['region_name'])
                    base_metric.save()
                    print("Saved BaseCondition: " + base_metric.condition_name)

                    for metric_type in ['.tif', '_normalized.tif']:
                        metric_path = os.path.join(
                            PLANSCAPE_ROOT_DIRECTORY, metric['filepath']) + metric_type
                        pw = 'pass'
                        cmds = 'export PGPASSWORD=pass; raster2pgsql -s 9822 -a -I -C -Y -f raster -n name -t 256x256 ' + \
                            metric_path + ' public.conditions_conditionraster | psql -U planscape -d planscape -h localhost -p 5432'
                        subprocess.call(cmds, shell=True)
                        print("Saved ConditionRaster: " + metric_path)

                        name = os.path.basename(os.path.normpath(metric_path))
                        condition_query = Condition.objects.filter(
                            condition_dataset=base_metric.pk, raster_name=name)
                        if len(condition_query) > 0:
                            print(
                                "BaseCondition " + metric['metric_name'] + " already exists; deleting.")
                            condition_query.delete()

                        metric_is_raw = (metric_type == '.tif')
                        condition = Condition(condition_dataset=base_metric, raster_name=name,
                                              condition_score_type=ConditionScoreType.CURRENT, is_raw=metric_is_raw)
                        condition.save()
                        print("Saved Condition: " + condition.raster_name)
