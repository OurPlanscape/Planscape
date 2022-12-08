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
    """Rewrites the NoData pixels in metric rasters as the standard NaN value and updates the raster profile accordingly.

    Args:
      region: The region to rewrite
    """
    config_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        if pillar['display']:
            for element in config.get_elements(pillar):
                for metric in config.get_metrics(element):
                    # TODO: Update to interprted when available
                    for metric_type in ['.tif', '_normalized.tif']:
                        metric_is_raw = True if metric_type == '.tif' else False
                        
                        reader = ConditionReader()
                        np_array_with_nan,original_profile = convert_metric_nodata_to_nan(reader, metric, ConditionScoreType.CURRENT, metric_is_raw)
                        
                        # Overwrite original version locally
                        base_filepath = os.path.join(os.path.dirname(PLANSCAPE_ROOT_DIRECTORY), metric['filepath']) + metric_type
                        with rasterio.open(
                            base_filepath,
                            'w',
                            driver=original_profile['driver'],
                            height=original_profile['height'],
                            width=original_profile['width'],
                            count=original_profile['count'],
                            dtype='float32',
                            crs=original_profile['crs'],
                            transform=original_profile['transform'],
                            nodata=np.nan,
                        ) as dst:
                            dst.write(np_array_with_nan, 1)


def load_metrics(region: str):
    """Loads the metric rasters defined by the configuration into the database if display=true."""
    config_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
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

                    # TODO: Update to interpreted when available
                    for metric_type in ['.tif', '_normalized.tif']:
                        metric_path = os.path.join(
                            os.path.dirname(PLANSCAPE_ROOT_DIRECTORY), metric['filepath']) + metric_type

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

                        metric_is_raw = True if metric_type == '.tif' else False
                        condition = Condition(condition_dataset=base_metric, raster_name=name,
                                              condition_score_type=ConditionScoreType.CURRENT, is_raw=metric_is_raw)
                        condition.save()
                        print("Saved Condition: " + condition.raster_name)


def compute_elements(region: str, reload: bool):
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
        if pillar['display']:
            for element in config.get_elements(pillar):
                raster_name = element['element_name'] + '_normalized.tif'

                # TODO: Compute FUTURE metrics when available
                reader = ConditionReader()
                element_nparray,profile = score_element(
                    reader, element, ConditionScoreType.CURRENT, recompute=True)

                # Save locally 
                base_filepath = os.path.join(os.path.dirname(PLANSCAPE_ROOT_DIRECTORY), element['filepath']) + '.tif'
                with rasterio.open(
                    base_filepath,
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
                    dst.write(element_nparray, 1)
                    print(element_nparray)

                # Load to database
                if reload:
                    query = BaseCondition.objects.filter(condition_name=element['element_name'])
                    if len(query) > 0:
                        print("Base Element " +
                              element['element_name'] + " already exists; deleting.")
                        query.delete()
                    base_element = BaseCondition(
                        condition_name=element['element_name'], condition_level=ConditionLevel.ELEMENT, region_name=region['region_name'])
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
                    
                    pw = 'pass'
                    cmds = 'export PGPASSWORD=pass; raster2pgsql -s 9822 -a -I -C -Y -f raster -n name -t 256x256 ' + \
                        base_filepath + ' public.conditions_conditionraster | psql -U planscape -d planscape -h localhost -p 5432'
                    subprocess.call(cmds, shell=True)
                    print("Saved Element Raster: " + base_filepath)