import os
from decouple import config
from typing import cast
from osgeo import gdal, osr
import numpy
import rasterio
import numpy as np

from config.conditions_config import PillarConfig
from base.conditions import *
from eval.compute_conditions import *

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))


def print(path: str):
    with rasterio.open(path) as src:
        print(src.read(1, out_shape=(1, int(src.height), int(src.width))))


def print_proj4(region: str):
    """Prints PROJ4 strings and dimensions of each metric raster in the given region."""
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        for element in config.get_elements(pillar):
            for metric in config.get_metrics(element):
                base_filepath = os.path.join(os.path.dirname(
                    PLANSCAPE_ROOT_DIRECTORY), metric['filepath'])
                print(base_filepath)
                dataset=gdal.Open(base_filepath + '.tif')
                srs=osr.SpatialReference(dataset.GetProjection())
                print("base data:\n" + srs.ExportToProj4())
                print("Size is {} x {}".format(dataset.RasterXSize, dataset.RasterYSize))

                normalized_filepath = os.path.join(PLANSCAPE_ROOT_DIRECTORY, metric['filepath'])
                dataset=gdal.Open(normalized_filepath + '_normalized.tif')
                srs=osr.SpatialReference(dataset.GetProjection())
                print("normalized data:\n" + srs.ExportToProj4() + '\n')
                print("Size is {} x {}".format(dataset.RasterXSize, dataset.RasterYSize))


def print_nodata_values(region: str):
    """Prints NoData values for each metric raster in the given region."""
    config_path = os.path.join(
        PLANSCAPE_ROOT_DIRECTORY, 'src/planscape/config/conditions.json')
    config = PillarConfig(config_path)

    region = config.get_region(region)
    for pillar in config.get_pillars(region):
        if pillar['display']:
            for element in config.get_elements(pillar):
                for metric in config.get_metrics(element):
                    print(metric['metric_name'])
                    for type in ['.tif', '_normalized.tif']:
                        metric_path = os.path.join(os.path.dirname(
                            PLANSCAPE_ROOT_DIRECTORY), metric['filepath']) + type
                        with rasterio.open(metric_path) as src:
                            nodatavalue = src.profile['nodata']
                            print(type + ": " +str(nodatavalue))

                            array = src.read(1, out_shape=(1, int(src.height), int(src.width)))
                            count = dict(zip(*numpy.unique(array, return_counts=True)))
                            if np.isnan(nodatavalue):
                                array = np.nan_to_num(array, nan=12345567)
                                count = dict(zip(*numpy.unique(array, return_counts=True)))
                                print("number of Nan pixels: " + str(count[12345567]))
                            else:
                                print("number of NoData pixels: " + str(count[nodatavalue]))