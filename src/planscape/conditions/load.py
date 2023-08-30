import os
import subprocess
from typing import cast

from base.condition_types import ConditionLevel, ConditionScoreType
from base.conditions import *
from config.conditions_config import PillarConfig
from django.conf import settings
from eval.compute_conditions import *

from .models import BaseCondition, Condition

"""
To run this script run the following commands

1) In your terminal window
    python manage.py shell
2) In the python interactive shell
    from conditions import load
    load.load_metrics('sierra-nevada')
"""


def convert_metrics_nodata(region_name: str):
    """Replaces the NoData pixels in metric rasters with the standard NaN value and updates the raster profile accordingly.

    Args:
      region: The region to rewrite
    """
    config_path = os.path.join(settings.BASE_DIR, 'config/conditions.json')
    config = PillarConfig(config_path)
    data_path = os.path.join(settings.BASE_DIR, '../..')

    region = config.get_region(region_name)
    if region is None:
        return
    for pillar in config.get_pillars(region):
        if not pillar.get('display', False):
            continue
        for element in config.get_elements(pillar):
            for metric in config.get_metrics(element):
                metric_filepath = metric.get('filepath', None)
                if metric_filepath is None:
                    continue
                # TODO: Update to interprted when available
                for metric_type in ['.tif', '_normalized.tif']:
                    metric_is_raw = (metric_type == '.tif')
                    reader = ConditionReader()
                    nan_condition = convert_metric_nodata_to_nan(
                        reader, metric, ConditionScoreType.CURRENT, metric_is_raw)
                    if nan_condition is None:
                        continue

                    # Overwrite original local version
                    base_filepath = os.path.join(os.path.dirname(
                        data_path), metric_filepath) + metric_type
                    with rasterio.open(base_filepath, 'w', nan_condition.profile) as dst:
                        dst.write(nan_condition.raster, 1)


def _load_metric(metric: Metric, metric_type: str, base_metric: BaseCondition):
    metric_filepath = metric.get('filepath', None)
    if metric_filepath is None:
        return
    metric_path = os.path.join(
        os.path.dirname(os.path.join(settings.BASE_DIR, '../..')), metric_filepath) + metric_type

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

    metric_is_raw = True if metric_type == '.tif' else False
    condition = Condition(condition_dataset=base_metric, raster_name=name,
                          condition_score_type=ConditionScoreType.CURRENT, is_raw=metric_is_raw)
    condition.save()
    print("Saved Condition: " + condition.raster_name)


def load_metrics(region_name: str):
    """Loads the metric rasters defined by the configuration into the database if display=true."""
    config_path = os.path.join(settings.BASE_DIR, 'config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region_name)
    if region is None:
        return
    for pillar in config.get_pillars(region):
        if not pillar.get('display', False):
            continue
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

                # TODO: Update to interpreted when available
                for metric_type in ['.tif', '_normalized.tif']:
                    _load_metric(metric, metric_type, base_metric)


def _load_condition(condition_name: str, condition_level: ConditionLevel, condition_score_type: ConditionScoreType, raster_name: str, region_name: str, filepath: str):
    query = BaseCondition.objects.filter(
        condition_name=condition_name)
    if len(query) > 0:
        print("BaseCondition " +
              condition_name + " already exists; deleting.")
        query.delete()
    base_condition = BaseCondition(
        condition_name=condition_name, condition_level=condition_level, region_name=region_name)
    base_condition.save()
    print("Saved BaseCondition: " + base_condition.condition_name)

    condition_query = Condition.objects.filter(
        condition_dataset=base_condition.pk, raster_name=raster_name)
    if len(condition_query) > 0:
        print(
            "Condition " + condition_name + " already exists; deleting.")
        condition_query.delete()
    condition = Condition(condition_dataset=base_condition, raster_name=raster_name,
                          condition_score_type=condition_score_type, is_raw=False)
    condition.save()
    print("Saved Condition: " + condition.raster_name)

    cmds = 'export PGPASSWORD=pass; raster2pgsql -s 9822 -a -I -C -Y -f raster -n name -t 256x256 ' + \
        filepath + ' public.conditions_conditionraster | psql -U planscape -d planscape -h localhost -p 5432'
    subprocess.call(cmds, shell=True)
    print("Saved Raster: " + filepath)


def _save_condition(raster: ConditionMatrix, filepath: str, profile: dict):
    with rasterio.open(
        filepath,
        'w',
        driver=profile['driver'],
        height=profile['height'],
        width=profile['width'],
        count=profile['count'],
        dtype=profile['dtype'],
        crs=profile['crs'],
        transform=profile['transform'],
        nodata=np.nan,
    ) as dst:
        dst.write(raster, 1)


def compute_elements(region_name: str, save: bool, reload: bool):
    """Computes element rasters based on the conditions config and saves them locally. Optionally loads them to our database.

    Args:
      region: The region to compute
      reload: True if the raster should be reloaded 

    """
    config_path = os.path.join(settings.BASE_DIR, 'config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region_name)
    if region is None:
        return
    pillars = config.get_pillars(region)
    if pillars is None:
        return
    for pillar in pillars:
        if not pillar.get('display', False):
            continue
        for element in config.get_elements(pillar):
            if 'filepath' not in element:
                continue
            raster_path = element['filepath'] + '_normalized.tif'

            # TODO: Compute FUTURE metrics when available
            reader = ConditionReader()
            computed_element = score_element(
                reader, element, ConditionScoreType.CURRENT, recompute=True)
            filepath = os.path.join(os.path.dirname(
                os.path.join(settings.BASE_DIR, '../..')), raster_path)

            # Save locally
            if save and computed_element is not None:
                _save_condition(computed_element.raster, filepath,
                                computed_element.profile)

            # Load to database
            if not reload:
                continue
            _load_condition(element['element_name'], ConditionLevel.ELEMENT,
                            ConditionScoreType.CURRENT, os.path.basename(raster_path), region['region_name'], filepath)


def compute_pillars(region_name: str, save: bool, reload: bool):
    """Computes pillar rasters based on the conditions config and saves them locally. Optionally loads them to our database.

    Args:
      region: The region to compute
      reload: True if the raster should be reloaded 
    """
    config_path = os.path.join(settings.BASE_DIR, 'config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region_name)
    if region is None:
        return
    pillars = config.get_pillars(region)
    if pillars is None:
        return
    for pillar in pillars:
        if not pillar.get('display', False) or 'filepath' not in pillar:
            continue
        raster_path = pillar['filepath'] + '_normalized.tif'

        # TODO: Compute FUTURE condition when available
        reader = ConditionReader()
        computed_pillar = score_pillar(
            reader, pillar, ConditionScoreType.CURRENT, recompute=True)
        filepath = os.path.join(os.path.dirname(
            os.path.join(settings.BASE_DIR, '../..')), raster_path)

        # Save locally
        if save and computed_pillar is not None:
            _save_condition(computed_pillar.raster, filepath,
                            computed_pillar.profile)

        # Load to database
        if not reload:
            continue
        _load_condition(pillar['pillar_name'], ConditionLevel.PILLAR,
                        ConditionScoreType.CURRENT, os.path.basename(raster_path), region['region_name'], filepath)
