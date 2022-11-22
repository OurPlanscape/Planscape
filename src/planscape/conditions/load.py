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

PLANSCAPE_ROOT_DIRECTORY = '/Users/elsieling/cnra/env'


def run(verbose=True):
   """Loads the rasters defined by the configuration into the database."""

   print("LC loading conditions")
   print(__name__)
   print(sys.path)

   config_path = os.path.join(
       PLANSCAPE_ROOT_DIRECTORY, 'Planscape/src/planscape/config/conditions.json')
   print(config_path)

   config = PillarConfig(config_path)

   data_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'data')
   print(data_path)

   metric_path = os.path.join(
       data_path, 'sierra_nevada/air_quality/particulate_matter/PotentialSmokeHighSeverity_2021_300m_base.tif')
   print(metric_path)
   print("Loading...")
   raster = GDALRaster(metric_path, write=True)
   print(raster.info)
   print("Done loading")
   dataset = BaseCondition(condition_name="high_severity_potential_smoke_emissions", condition_level=ConditionLevel.METRIC,
                           region_name=RegionName.SIERRA_CASCADE_INYO)
   print("Saving")
   dataset.save()
   # condition = Condition(condition_dataset=dataset, geometry=raster,
   #                       condition_score_type=ConditionScoreType.CURRENT)
   # condition.save()                     


