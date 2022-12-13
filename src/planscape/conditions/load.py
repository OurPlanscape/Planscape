import os
from pathlib import Path
from decouple import config
from typing import cast
import sys

from django.contrib.gis.utils.layermapping import LayerMapping
from django.db.models.signals import pre_save
from django.contrib.gis.gdal.raster.source import GDALRaster

from base.condition_types import ConditionLevel, ConditionScoreType
from base.region_name import RegionName
from config.conditions_config import PillarConfig
from .models import BaseCondition, Condition
from base.conditions import *
from eval.compute_conditions import *
from osgeo import gdal, osr
import psycopg2
import subprocess

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))

"""
To run this script run the following commands

1) In your terminal window
    python manage.py shell
2) In the python interactive shell
    from conditions import load
    load.load_metrics('sierra_cascade_inyo')
"""

def convert_metrics_nodata(region: str):
    """Replaces the NoData pixels in metric rasters with the standard NaN value and updates the raster profile accordingly.

    Args:
      region: The region to rewrite
    """
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        if not pillar['display']:
            continue
        for element in config.get_elements(pillar):
            for metric in config.get_metrics(element):
                # TODO: Update to interprted when available
                for metric_type in ['.tif', '_normalized.tif']:
                    metric_is_raw = True if metric_type == '.tif' else False

                    reader = ConditionReader()
                    nan_condition = convert_metric_nodata_to_nan(
                        reader, metric, ConditionScoreType.CURRENT, metric_is_raw)

                    # Overwrite original local version
                    base_filepath = os.path.join(os.path.dirname(
                        PLANSCAPE_ROOT_DIRECTORY), metric['filepath']) + metric_type
                    with rasterio.open(base_filepath, 'w', nan_condition.profile) as dst:
                        dst.write(nan_condition.raster, 1)


def _load_metric(metric: Metric, metric_type: str, base_metric: BaseCondition):
    metric_path = os.path.join(
        os.path.dirname(PLANSCAPE_ROOT_DIRECTORY), metric['filepath']) + metric_type

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


def load_metrics(region: str):
    """Loads the metric rasters defined by the configuration into the database if display=true."""
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        if not pillar['display']:
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

def _load_element(element: Element, raster_name: str, region_name: str, filepath: str):
    query = BaseCondition.objects.filter(
        condition_name=element['element_name'])
    if len(query) > 0:
        print("Base Element " +
                element['element_name'] + " already exists; deleting.")
        query.delete()
    base_element = BaseCondition(
        condition_name=element['element_name'], condition_level=ConditionLevel.ELEMENT, region_name=region_name)
    base_element.save()
    print("Saved Base Element: " + base_element.condition_name)

    condition_query = Condition.objects.filter(
        condition_dataset=base_element.pk, raster_name=raster_name)
    if len(condition_query) > 0:
        print(
            "Element " + element['element_name'] + " already exists; deleting.")
        condition_query.delete()
    condition = Condition(condition_dataset=base_element, raster_name=raster_name,
                            condition_score_type=ConditionScoreType.CURRENT, is_raw=False)
    condition.save()
    print("Saved Element: " + condition.raster_name)

    cmds = 'export PGPASSWORD=pass; raster2pgsql -s 9822 -a -I -C -Y -f raster -n name -t 256x256 ' + \
        filepath + ' public.conditions_conditionraster | psql -U planscape -d planscape -h localhost -p 5432'
    subprocess.call(cmds, shell=True)
    print("Saved Element Raster: " + filepath)


def compute_elements(region: str, save: bool, reload: bool):
    """Computes element rasters based on the conditions config and saves them locally. Optionally loads them to our database.

    Args:
      region: The region to compute
      reload: True if the raster should be reloaded 

    """
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        if not pillar['display']:
            continue
        for element in config.get_elements(pillar):
            raster_name = element['element_name'] + '_normalized.tif'

            # TODO: Compute FUTURE metrics when available
            reader = ConditionReader()
            computed_element = score_element(
                reader, element, ConditionScoreType.CURRENT, recompute=True)
            filepath = os.path.join(os.path.dirname(
                PLANSCAPE_ROOT_DIRECTORY), element['filepath']) + '.tif'
            
            # Save locally
            if not save:
                continue
            with rasterio.open(
                filepath,
                'w',
                driver=computed_element.profile['driver'],
                height=computed_element.profile['height'],
                width=computed_element.profile['width'],
                count=computed_element.profile['count'],
                dtype=computed_element.profile['dtype'],
                crs=computed_element.profile['crs'],
                transform=computed_element.profile['transform'],
                nodata=np.nan,
            ) as dst:
                dst.write(computed_element.raster, 1)

            # Load to database
            if not reload:
                continue
            _load_element(element, raster_name, region['region_name'], filepath)

