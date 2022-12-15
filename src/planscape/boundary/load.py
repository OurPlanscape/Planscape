import os
from pathlib import Path
from typing import cast

from config.boundary_config import BoundaryConfig
from django.conf import settings
from django.contrib.gis.utils.layermapping import LayerMapping
from django.db.models.signals import pre_save

from .models import Boundary, BoundaryDetails


def run(boundary_to_load=None, verbose=True):
    """Loads the shapefiles defined by the configuration into the database."""
    # Function that connects a BoundaryDetails object with a Boundary object
    # in the database.
    def presave_callback_generator(fkey):
        def cb(sender, instance, *args, **kwargs):
            instance.boundary = fkey
        return cb

    # Build the configuration object.
    config_path = os.path.join(
        settings.BASE_DIR, 'config/boundary.json')
    config = BoundaryConfig(config_path)

    # Read the shapefiles and add Boundary and BoundaryDetail objects.
    data_path = os.path.join(settings.BASE_DIR, '../../data')
    for boundary in config.get_boundaries():
        # Check if need to load just one boundary
        boundary_name = boundary['boundary_name']
        if boundary_to_load is not None and boundary_to_load != boundary_name:
            continue

        # Create the new top-level Boundary
        print("Creating Boundary " + boundary_name)
        display_name = boundary.get('display_name', None)
        region_name = boundary.get('region_name', None)
        if region_name is not None and region_name == "none":
            region_name = None
        query = Boundary.objects.filter(boundary_name__exact=boundary_name)
        if len(query) > 0:
            print("Boundary " + boundary_name + " already exists; deleting.")
            query.delete()
        boundary_obj = Boundary(boundary_name=boundary_name, display_name=display_name,
                                region_name=region_name)
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
