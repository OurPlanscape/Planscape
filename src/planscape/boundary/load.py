import os
from pathlib import Path
from decouple import config
from typing import cast

from django.contrib.gis.utils.layermapping import LayerMapping
from django.db.models.signals import pre_save

from config.boundary_config import BoundaryConfig
from .models import Boundary, BoundaryDetails

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))


def run(verbose=True):
    """Loads the shapefiles defined by the configuration into the database."""
    # Function that connects a BoundaryDetails object with a Boundary object
    # in the database.
    def presave_callback_generator(fkey):
        def cb(sender, instance, *args, **kwargs):
            instance.boundary = fkey
        return cb

    # Build the configuration object.
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/boundary.json')
    config = BoundaryConfig(config_path)

    # Read the shapefiles and add Boundary and BoundaryDetail objects.
    data_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, 'data')
    for boundary in config.get_boundaries():
        # Create the new top-level Boundary
        boundary_name = boundary['boundary_name']
        print("Creating Boundary " + boundary_name)
        query = Boundary.objects.filter(boundary_name__exact=boundary_name)
        if len(query) > 0:
            print("Boundary " + boundary_name + " already exists; deleting.")
            query.delete()
        boundary_obj = Boundary(boundary_name=boundary_name)
        boundary_obj.save()

        shapefile_field_mapping = dict(boundary['shapefile_field_mapping'])
        shapefile_field_mapping['geometry'] = boundary['geometry_type']
        filepath = Path(os.path.join(data_path, boundary['filepath']))
        srs = boundary['source_srs']
        lm = LayerMapping(BoundaryDetails, filepath,
                          shapefile_field_mapping, source_srs=srs, transform=True)
        presave_callback = presave_callback_generator(boundary_obj)
        pre_save.connect(presave_callback, sender=BoundaryDetails)
        lm.save(strict=True, verbose=verbose)
        pre_save.disconnect(presave_callback, sender=BoundaryDetails)
