import os
from pathlib import Path
from decouple import config
from typing import cast

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


PLANSCAPE_ROOT_DIRECTORY = '/Users/elsieling/cnra/env'


def run(region: str):
    """Loads the rasters defined by the configuration into the database."""
    config_path = os.path.join(
    PLANSCAPE_ROOT_DIRECTORY, 'Planscape/src/planscape/config/conditions.json')
    config = PillarConfig(config_path)
    # data_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'data')

    # Save RRK base and normalized metrics to DB
    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        for element in config.get_elements(pillar):
            for metric in config.get_metrics(element):
                    print(metric['metric_name'])
                    base_metric = BaseCondition(condition_name=metric['metric_name'], condition_level=ConditionLevel.METRIC,
                        region_name=region['region_name'])
                    metric_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, metric['filepath']) + '.tif'
                    condition = Condition(condition_dataset=base_metric, geometry=raster, condition_score_type=ConditionScoreType.CURRENT)
            # Compute elements/pillars/ecosystem scores and save to database
            # base_element = BaseCondition(condition_name=element['element_name'], condition_level=ConditionLevel.ELEMENT, region_name=region['region_name'])
            # reader = ConditionReader()
            # element_nparray = score_element(reader, element, ConditionScoreType.CURRENT, recompute=True)
            






    # query = BaseCondition.objects.filter(condition_name=condition_name)
    # if len(query) > 0:
    #     print("BaseCondition " + condition_name + " already exists; deleting.")
    #     query.delete()
    # dataset.save()
    # print("Saved base condition: " + dataset.condition_name)



    # condition.save()              
    # print("Saved condition with BaseCondition: " + str(condition.pk))        

    # print("Verifying that raster was written")
    # query = Condition.objects.get(pk=condition.pk)
    # print(query.geometry.srid)


    # for boundary in config.get_metric('tcsi', '')
    #    # Create the new top-level Boundary
    #    boundary_name = boundary['boundary_name']
    #    print("Creating Boundary " + boundary_name)
    #    query = Boundary.objects.filter(boundary_name__exact=boundary_name)
    #    if len(query) > 0:
    #        print("Boundary " + boundary_name + " already exists; deleting.")
    #        query.delete()
    #    boundary_obj = Boundary(boundary_name=boundary_name)
    #    boundary_obj.save()

    #    shapefile_field_mapping = dict(boundary['shapefile_field_mapping'])
    #    shapefile_field_mapping['geometry'] = boundary['geometry_type']
    #    filepath = Path(os.path.join(data_path, boundary['filepath']))
    #    srs = boundary['source_srs']
    #    lm = LayerMapping(BoundaryDetails, filepath,
    #                      shapefile_field_mapping, source_srs=srs, transform=True)
    #    presave_callback = presave_callback_generator(boundary_obj)
    #    pre_save.connect(presave_callback, sender=BoundaryDetails)
    #    lm.save(strict=True, verbose=verbose)
    #    pre_save.disconnect(presave_callback, sender=BoundaryDetails)
