import os
from pathlib import Path
from decouple import config
from typing import cast

from django.contrib.gis.gdal.raster.source import GDALRaster
from django.db.models.signals import pre_save

from base.condition_types import ConditionLevel, ConditionScoreType
from base.region_name import RegionName
from config.conditions_config import ConditionConfig
from .models import BaseCondition, Condition

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))


def run(verbose=True):
    """Loads the rasters defined by the configuration into the database."""
    # Function that connects a object with a Boundary object
    # in the database.
    def presave_callback_generator(fkey):
        def cb(sender, instance, *args, **kwargs):
            instance.boundary = fkey
        return cb

    # Build the configuration object.
    config_path = os.path.join(
       PLANSCAPE_ROOT_DIRECTORY, 'src/config/condition.json')
    config = ConditionConfig(config_path)

    # Read the rasters and add Condition and AbstractCondition objects.
    data_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'data')
    metric = config.get_metric(
            "sierra_nevada", "fire_dynamics", "functional_fire", "annual_burn_probability")
    # Create the new top-level Boundary
    metric_name = metric['metric_name']
    print("Creating Metric " + metric_name)
    query = BaseCondition.objects.filter(condition_name__exact=metric_name)
    if len(query) > 0:
        print("Metric " + metric_name + " already exists; deleting.")
        query.delete()
    metric_obj = BaseCondition(condition_name=metric_name)
    metric_obj.save()

    filepath = Path(os.path.join(data_path, metric['filepath']))
  
    presave_callback = presave_callback_generator(metric_obj)
    pre_save.connect(presave_callback, sender=Condition)
    pre_save.disconnect(presave_callback, sender=Condition)

    print("Loading...")
    raster = GDALRaster(os.path.join(
        data_path, 'conditions/tcsi/forest_resilience/current.tif'), write=True)
    dataset = BaseCondition(condition_name='forest_resilience', condition_level=ConditionLevel.PILLAR,
                            region_name=RegionName.TCSI)
    print("Saving")
    dataset.save()
    condition = Condition(condition_dataset=dataset, geometry=raster,
                          condition_score_type=ConditionScoreType.CURRENT)
    condition.save()                      


