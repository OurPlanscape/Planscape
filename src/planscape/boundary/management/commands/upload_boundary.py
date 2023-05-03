import argparse
import os
from pathlib import Path

from config.boundary_config import BoundaryConfig
from django.conf import settings
from django.contrib.gis.utils.layermapping import LayerMapping
from django.core.management.base import BaseCommand, CommandError
from django.db.models.signals import pre_save

from boundary.models import Boundary, BoundaryDetails


class Command(BaseCommand):
    help = (
        "Uploads a boundary layer specified in the boundary configuration file "
        "into the Planscape database."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "data_directory", nargs="?", type=str, help="Location of the boundary data."
        )
        parser.add_argument(
            "--boundary",
            nargs="?",
            type=str,
            help=(
                "Name of the boundary to upload; if missing, all "
                "boundaries are uploaded."
            ),
        )
        parser.add_argument(
            "--configuration_file",
            nargs="?",
            type=str,
            help="Path to the boundary.json file; default is BASE_DIR/config/boundary.json.",
        )
        parser.add_argument(
            "--force",
            type=bool,
            default=False,
            action=argparse.BooleanOptionalAction,
            help="Overwrite the boundary layer if it exists.",
        )
        parser.add_argument(
            "--verbose",
            type=bool,
            default=True,
            action=argparse.BooleanOptionalAction,
            help="Show the commands to be run but do not run them.",
        )
        parser.add_argument(
            "--strict",
            type=bool,
            default=True,
            action=argparse.BooleanOptionalAction,
            help="If false, ignore errors if a polygon cannot be converted and uploaded.",
        )

    def handle(self, *args, **options):
        data_directory = options["data_directory"]
        if data_directory is None:
            raise CommandError("Must specify the data directory as an argument.")
        configuration_file = options["configuration_file"]
        if configuration_file is None:
            configuration_file = os.path.join(settings.BASE_DIR, "config/boundary.json")
        boundary_to_load = options["boundary"]
        force = options["force"]
        verbose = options["verbose"]
        strict = options["strict"]

        def presave_callback_generator(fkey):
            def cb(sender, instance, *args, **kwargs):
                instance.boundary = fkey

            return cb

        # Build the configuration object.
        config = BoundaryConfig(configuration_file)

        # Read the shapefiles and add Boundary and BoundaryDetail objects.
        found: bool = False
        for boundary in config.get_boundaries():
            # Check if need to load just one boundary
            boundary_name = boundary["boundary_name"]
            if boundary_to_load is not None and boundary_to_load != boundary_name:
                continue
            found = True

            # Create the new top-level Boundary
            self.stdout.write("Creating boundary " + boundary_name)
            display_name = boundary.get("display_name", None)
            region_name = boundary.get("region_name", None)
            if region_name is not None and region_name == "none":
                region_name = None
            query = Boundary.objects.filter(boundary_name__exact=boundary_name)
            if len(query) > 0:
                self.stdout.write(
                    "Boundary {0} exists in the database".format(boundary_name)
                )
                if not force:
                    self.stdout.write(
                        "Exiting; use --force to overwrite the existing boundary."
                    )
                    return
                query.delete()
            boundary_obj = Boundary(
                boundary_name=boundary_name,
                display_name=display_name,
                region_name=region_name,
            )
            boundary_obj.save()

            shapefile_field_mapping = dict(boundary["shapefile_field_mapping"])
            shapefile_field_mapping["geometry"] = boundary["geometry_type"]
            filepath = Path(os.path.join(data_directory, boundary["filepath"]))
            srs = boundary["source_srs"]
            try:
                lm = LayerMapping(
                    BoundaryDetails,
                    filepath,
                    shapefile_field_mapping,
                    source_srs=srs,
                    transform=True,
                )
                presave_callback = presave_callback_generator(boundary_obj)
                pre_save.connect(presave_callback, sender=BoundaryDetails)
                lm.save(strict=strict, verbose=verbose)
                pre_save.disconnect(presave_callback, sender=BoundaryDetails)
            except Exception as ex:
                self.stdout.write(f"Error: {ex}\n Boundary {boundary_name} failed.")
                continue

        if not found:
            self.stdout.write(
                "Warning: no boundaries updated; check the --boundary argument."
            )
