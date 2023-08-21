import json
import numpy as np
import os
import rasterio
import subprocess

from attributes.models import Attribute
from base.conditions import convert_nodata_to_nan
from eval.raster_data import RasterData
from planscape import settings


# Loads the raster in the raster path to the DB table,
# attributes_attributeraster.
# Of note: Multiple rasters will be written to the DB, each with dimensions,
# 256 pixels x 256 pixels.
# The names of the rasters in the DB will be the same as the name of the
# rasters on disk. The name includes the file extension.
# Warning: it's possible for multiple rasters with the same name to be loaded 
# to the DB: before re-loading a raster, remember to delete the previous 
# version.
# DEPRECATED
def _load_raster(raster_path):
    cmds = 'export PGPASSWORD=' + settings.PLANSCAPE_DATABASE_PASSWORD + \
        '; raster2pgsql -s ' + str(settings.CRS_FOR_RASTERS) + \
        ' -a -I -C -Y -f raster -n name -t 256x256 ' + \
        raster_path + \
        ' public.attributes_attributeraster | psql -U planscape -d planscape -h ' \
        + settings.PLANSCAPE_DATABASE_HOST + \
        ' -p ' + str(settings.PLANSCAPE_DATABASE_PORT)

    subprocess.call(cmds, shell=True)


# Validates an attribute dictionary parsed from an attributes.json config.
def _validate_attribute(attribute: dict):
    for key in ['filepath', 'filename', 'attribute_name', 'display_name']:
        if attribute[key] is None or len(attribute[key]) == 0:
            raise Exception(
                "attribute config error: attribute missing key, %s" % key)


# Validates the top-level attributes dictionary parsed from an attributes.json
# config.
def _validate_attributes_config(attributes_config: dict):
    for attribute in attributes_config['attributes']:
        _validate_attribute(attribute)


# Converts the nodata values in the raster input file to nan, and writes the
# resultant raster to the raster output file.
# Usage:
#   >> python manage.py shell
#   >> from attributes.load import convert_nodata_to_nan_in_raster_file
#   >> convert_nodata_to_nan_in_raster_file(<input_path>, <output_path>)
# note: Input and output filenames encompass the entire path!
#   e.g. /Users/<dir1>/<dir2>/<...>/buildings.tif
def convert_nodata_to_nan_in_raster_file(input_filename: str,
                                         output_filename: str):
    with rasterio.open(input_filename) as src:
        input_data = RasterData(src.read(1, out_shape=(
            1, int(src.height), int(src.width))), src.profile)
        new_profile = input_data.profile
        new_profile['nodata'] = np.nan
        output_data = RasterData(
            convert_nodata_to_nan(
                input_data.profile['nodata'],
                input_data.raster),
            new_profile)
        with rasterio.open(output_filename, 'w', **output_data.profile) as dst:
            dst.write(output_data.raster, 1)


# Loads an attribute to the DB (and updates AttributeRaster and
# Attribute tables accordingly).
# Usage:
#   >> python manage.py shell
#   >> from attributes.load import save_attribute_to_db
#   >> save_attribute_to_db("data",
#                           "buildings_300m.tif",
#                           "sierra_cascada_inyo",
#                           "buildings",
#                           "Buildings")
def save_attribute_to_db(
        data_path: str, filename: str, attribute_name: str,
        attribute_display_name):
    filepath = os.path.join(settings.BASE_DIR, "../..",
                            data_path, filename)
    convert_nodata_to_nan_in_raster_file(filepath, filepath)
    _load_raster(filepath)
    attribute = Attribute(display_name=attribute_display_name,
                          attribute_name=attribute_name, raster_name=filename)
    attribute.save()


# Loads the attributes listed in an attributes.json config file to the DB.
# An example attributes.json config file is in config/attributes.json.
# Before calling, double-check that the raster filepaths correctly represent
# data in the local disk.
# Usage:
#   >> python manage.py shell
#   >> from attributes.load import load_attributes
#   >> load_attributes("config/attributes.json")
def load_attributes(attributes_config_path):
    with open(os.path.join(settings.BASE_DIR, attributes_config_path), "r") as stream:
        try:
            attributes_config = json.load(stream)
            _validate_attributes_config(attributes_config)
        except:
            with json.JSONDecodeError as exc:
                raise ValueError(
                    "Could not parse JSON file; exception was " + str(exc))

        for attribute in attributes_config['attributes']:
            save_attribute_to_db(
                data_path=attribute['filepath'],
                filename=attribute['filename'],
                attribute_name=attribute['attribute_name'],
                attribute_display_name=attribute['display_name'])
