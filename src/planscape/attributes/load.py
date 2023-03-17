import json
import numpy as np
import os
import rasterio
import subprocess

from attributes.models import Attribute, BaseAttribute
from base.conditions import convert_nodata_to_nan
from eval.raster_data import RasterData
from planscape import settings


# Loads the raster in the raster path to the DB table,
# attributes_attributeraster.
# Of note: Multiple rasters will be written to the DB, each with dimensions,
# 256 x 256.
# The names of the rasters in the DB will be the same as the name of the
# rasters on disk (including the format indicator at the end).
def _load_raster(raster_path):
    cmds = 'export PGPASSWORD=' + settings.PLANSCAPE_DATABASE_PASSWORD + '; raster2pgsql -s 9822 -a -I -C -Y -f raster -n name -t 256x256 ' + \
        raster_path + ' public.attributes_attributeraster | psql -U planscape -d planscape -h ' + settings.PLANSCAPE_DATABASE_HOST + ' -p 5432'

    subprocess.call(cmds, shell=True)


# Validates an attribute dictionary parsed from an attributes.json config.
def _validate_attribute(attribute: dict):
    for key in ['filepath', 'filename', 'attribute_name', 'display_name']:
        if attribute[key] is None or len(attribute[key]) == 0:
            raise Exception(
                "attribute config error: attribute missing key, %s" % key)


# Validates a region dictionary parsed from an attributes.json config.
def _validate_region(region: dict):
    for key in ['attributes', 'region_name']:
        if region[key] is None or len(region[key]) == 0:
            raise Exception(
                "attribute config eerror: region missing key, %s" % key)
    for attribute in region['attributes']:
        _validate_attribute(attribute)


# Validates the top-level attributes dictionary parsed from an attributes.json
# config.
def _validate_attributes_config(attributes_config: dict):
    if attributes_config['regions'] is None or len(
            attributes_config['regions']) == 0:
        raise Exception("attributee config error: missing key, regions")
    for region in attributes_config['regions']:
        _validate_region(region)


# Converts the nodata values in the raster input file into nan, and writes the
# resultant raster to the raster output file.
# Usage:
#   >> python manage.py shell
#   >> from attributes.load import convert_nodata_to_nan_in_raster_file
#   >> convert_nodata_to_nan_in_raster_file(<input_path>, <output_path>)
# note: Input and output filenames encompass the entire path!
#   e.g. /Users/<dir1>/<dir2>/<...>/buildings.tif
# note: This isn't called autommatically in save_attribute_to_db and
# load_attributes: it must be called separately as needed.
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


# Saves an attribute to db, updating AttributeRaster, BaseAttribute, and
# Attribute.
# Usage:
#   >> python manage.py shell
#   >> from attributes.load import save_attribute_to_db
#   >> save_attribute_to_db("data/sierra_nevada",
#                           "buildings_300m.tif",
#                           "sierra_cascada_inyo",
#                           "buildings",
#                           "Buildings")
def save_attribute_to_db(
        data_path: str, filename: str, region: str, attribute_name: str,
        attribute_display_name):
    filepath = os.path.join(settings.BASE_DIR, "../..",
                            data_path, filename)
    convert_nodata_to_nan_in_raster_file(filepath, filepath)
    _load_raster(filepath)
    base_attribute = BaseAttribute(
        region_name=region, display_name=attribute_display_name,
        attribute_name=attribute_name)
    base_attribute.save()
    attribute = Attribute(
        attribute_dataset=base_attribute, raster_name=filename)
    attribute.save()


# Loads the attributes listed in an attributes.json config file to DB.
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

        for region in attributes_config['regions']:
            for attribute in region['attributes']:
                save_attribute_to_db(
                    data_path=os.path.join(region['filepath'],
                                           attribute['filepath']),
                    filename=attribute['filename'],
                    region=region['region_name'],
                    attribute_name=attribute['attribute_name'],
                    attribute_display_name=attribute['display_name'])
