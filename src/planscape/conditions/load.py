import os
from pathlib import Path
from decouple import config
from typing import cast

from django.contrib.gis.utils.layermapping import LayerMapping
from django.db.models.signals import pre_save
from django.contrib.gis.gdal.raster.source import GDALRaster

from base.condition_types import ConditionLevel, ConditionScoreType
from base.region_name import RegionName
from config.pillar_config import PillarConfig
from .models import ConditionDataset, Condition

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))


def run(verbose=True):
    """Loads the rasters defined by the configuration into the database."""
    # Function that connects a  object with a Boundary object
    # in the database.
    def presave_callback_generator(fkey):
        def cb(sender, instance, *args, **kwargs):
            instance.boundary = fkey
        return cb

    # Build the configuration object.
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/config/metrics.json')
    config = PillarConfig(config_path)

    # Read the shapefiles and add Boundary and BoundaryDetail objects.
    data_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'data')

    print("Loading...")
    raster = GDALRaster(os.path.join(
        data_path, 'conditions/tcsi/forest_resilience/current.tif'), write=True)
    dataset = ConditionDataset(condition_name='forest_resilience', condition_level=ConditionLevel.PILLAR,
                               region_name=RegionName.TCSI)
    print("Saving")
    dataset.save()
    condition = Condition(condition_dataset=dataset, geometry=raster,
                          condition_score_type=ConditionScoreType.CURRENT)
    condition.save()                      

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
