import os
from pathlib import Path
from decouple import config
from typing import cast

from django.contrib.gis.utils.layermapping import LayerMapping
from django.db.models.signals import pre_save

from config.condition_config import ConditionConfig
from .models import AbstractCondition, Condition

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))


def run(verbose=True):
    """Loads the rasterfiles defined by the configuration into the database."""
    # Function that connects an AbstractCondition object with Condition object
    # in the database.
    def presave_callback_generator(fkey):
        def cb(sender, instance, *args, **kwargs):
            instance.condition = fkey
        return cb

    # Build the configuration object.
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/config/condition.json')
    config = ConditionConfig(config_path)

    # Read the rasterfiles and add Condition and AbstractCondition objects.
    data_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'data')
    metric = config.get_metric(
            "sierra_nevada", "fire_dynamics", "functional_fire", "annual_burn_probability")
    # Create the new top-level Boundary
    metric_name = metric['metric_name']
    print("Creating Metric " + metric_name)
    query = AbstractCondition.objects.filter(condition_name__exact=metric_name)
    if len(query) > 0:
        print("Metric " + metric_name + " already exists; deleting.")
        query.delete()
    metric_obj = AbstractCondition(condition_name=metric_name)
    metric_obj.save()

    filepath = Path(os.path.join(data_path, metric['filepath']))
  
    presave_callback = presave_callback_generator(metric_obj)
    pre_save.connect(presave_callback, sender=Condition)
    pre_save.disconnect(presave_callback, sender=Condition)
