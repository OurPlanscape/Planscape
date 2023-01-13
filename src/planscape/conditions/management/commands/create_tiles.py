import os
import subprocess

from config.conditions_config import PillarConfig
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

ZOOM_LEVELS = '7-13'


class Command(BaseCommand):
    help = 'Converts a directory of rasters pecified by config/conditions.json into tiles.'

    def add_arguments(self, parser):
        parser.add_argument('data_directory', nargs='?', type=str)
        parser.add_argument('--zoom_levels', nargs='?',
                            type=str, default=ZOOM_LEVELS)
        parser.add_argument('--region_name', nargs='?',
                            type=str, default='sierra_cascade_inyo')
        parser.add_argument('--dry_run', nargs='?',
                            type=bool, default=True)
        parser.add_argument('--colormap', nargs='?', type=str, default='turbo')

    def _convert_tif_to_tiles(self, dry_run: bool, data_directory: str, filepath: str | None,
                              normalized: bool, invert: bool, colormap: str,
                              zoom_levels: str) -> None:
        """
        Converts
            <data_directory>/data/<filepath>.tif (if normalized is false), or
            <data_directory>/data/<filepath>_normalized.tif (if normalized is true)
        to a set of tiles stored in
            <data_directory>/tiles/<filepath>/{zoom}/{x}/{y}.png

        Args:
            dry_run: If true, just print the commands to be run
            data_directory: Root directory of the input (data/) and output (tiles/)
            filepath: Path for the files
            normalized: If true, use the "_normalized.tif" raster file
            invert: If true, use the inverted version of the colormap
            colormap: Which colormap to use
            zoom_levels: String of the form '<min>-<max>' of zoom levels (e.g., '7-13')
        """
        if filepath is None:
            return
        # Set up the inputs
        raster_base = os.path.basename(filepath)
        raster_file = raster_base + \
            ('_normalized.tif' if normalized else '.tif')
        input_dir = os.path.dirname(os.path.join(data_directory, filepath))
        input_file = os.path.join(input_dir, raster_file)
        colormap_file = os.path.join(os.path.dirname(os.path.realpath(
            __file__)), colormap + ('_inverted.cpt' if invert else '.cpt'))

        # Set up the outputs
        output_filepath = filepath.replace('data/', 'tiles/')
        output_dir = os.path.dirname(
            os.path.join(data_directory, output_filepath))
        gdaldem_file = os.path.join(
            output_dir, raster_file.replace('.tif', '.vrt'))
        output_file = os.path.join(
            output_dir, raster_file.removesuffix('.tif'))

        os.makedirs(output_dir, exist_ok=True)

        # Build the commands.  The first converts the raster to a color-relief version, the second
        # to tiles.
        gdaldem = ['gdaldem', 'color-relief', input_file,
                   colormap_file, gdaldem_file, '-of', 'VRT']
        gdal2tiles = ['gdal2tiles.py', '-s', settings.CRS_9822_PROJ4,
                      '--xyz', '-z', zoom_levels, gdaldem_file, output_file]
        print('-----------------------')
        print('Converting: ' + filepath)
        print(' '.join(gdaldem))
        print(' '.join(gdal2tiles))
        if not dry_run:
            subprocess.run(gdaldem, stdout=subprocess.PIPE,
                           stderr=subprocess.STDOUT, check=True)
            subprocess.run(gdal2tiles, capture_output=True, check=True)

    def handle(self, *args, **options):
        data_directory = options['data_directory']
        dry_run = options['dry_run']
        region_name = options['region_name']
        colormap = options['colormap']
        zoom_levels = options['zoom_levels']

        config_path = os.path.join(settings.BASE_DIR, 'config/conditions.json')
        config = PillarConfig(config_path)
        region = config.get_region(region_name)
        if region is None:
            return
        for pillar in config.get_pillars(region):
            if not pillar.get('display', False):
                continue
            self._convert_tif_to_tiles(dry_run, data_directory,
                                       pillar.get('filepath'),
                                       normalized=True, invert=False, colormap=colormap,
                                       zoom_levels=zoom_levels)
            for element in config.get_elements(pillar):
                self._convert_tif_to_tiles(dry_run, data_directory,
                                           element.get('filepath'),
                                           normalized=True, invert=False, colormap=colormap,
                                           zoom_levels=zoom_levels)
                for metric in config.get_metrics(element):
                    self._convert_tif_to_tiles(dry_run, data_directory,
                                               metric.get('filepath'),
                                               normalized=True, invert=False, colormap=colormap,
                                               zoom_levels=zoom_levels)
                    self._convert_tif_to_tiles(dry_run, data_directory,
                                               metric.get('filepath'),
                                               normalized=False,
                                               invert=metric.get(
                                                   'invert_raw', False),
                                               colormap=colormap, zoom_levels=zoom_levels)
