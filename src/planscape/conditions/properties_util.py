import os
from typing import cast

import numpy
import numpy as np
import rasterio
from base.conditions import *
from config.conditions_config import PillarConfig
from decouple import config
from django.conf import settings
from eval.compute_conditions import *
from osgeo import gdal, osr


def print(path: str):
    with rasterio.open(path) as src:
        print(src.read(1, out_shape=(1, int(src.height), int(src.width))))


def print_proj4(region_name: str):
    """Prints PROJ4 strings and dimensions of each metric raster in the given region."""
    config_path = os.path.join(settings.BASE_DIR, "config/conditions.json")
    config = PillarConfig(config_path)
    data_path = os.path.join(settings.BASE_DIR, "../..")

    region = config.get_region(region_name)
    if region is None:
        return
    pillars = config.get_pillars(region)
    if pillars is None:
        return
    for pillar in pillars:
        for element in config.get_elements(pillar):
            for metric in config.get_metrics(element):
                base_filepath = os.path.join(
                    os.path.dirname(data_path), metric.get("filepath", "")
                )
                print(base_filepath)
                dataset = gdal.Open(base_filepath + ".tif")
                srs = osr.SpatialReference(dataset.GetProjection())
                print("base data:\n" + srs.ExportToProj4())
                print(
                    "Size is {} x {}".format(dataset.RasterXSize, dataset.RasterYSize)
                )

                dataset = gdal.Open(base_filepath + "_normalized.tif")
                srs = osr.SpatialReference(dataset.GetProjection())
                print("normalized data:\n" + srs.ExportToProj4() + "\n")
                print(
                    "Size is {} x {}".format(dataset.RasterXSize, dataset.RasterYSize)
                )


def print_nodata_values(region_string: str):
    """Prints NoData values for each metric raster in the given region."""
    config_path = os.path.join(settings.BASE_DIR, "config/conditions.json")
    config = PillarConfig(config_path)
    data_path = os.path.join(settings.BASE_DIR, "../..")

    region = config.get_region(region_string)
    if region is None:
        return
    pillars = config.get_pillars(region)
    if pillars is None:
        return
    for pillar in pillars:
        if not pillar.get("display", False):
            continue
        for element in config.get_elements(pillar):
            for metric in config.get_metrics(element):
                print(metric["metric_name"])
                for type in [".tif", "_normalized.tif"]:
                    filepath = metric.get("filepath", None)
                    if filepath is None:
                        continue
                    metric_path = os.path.join(data_path, filepath) + type
                    with rasterio.open(metric_path) as src:
                        nodatavalue = src.profile["nodata"]
                        print(type + ": " + str(nodatavalue))

                        array = src.read(
                            1, out_shape=(1, int(src.height), int(src.width))
                        )
                        count: dict[int, float] = dict(
                            zip(*numpy.unique(array, return_counts=True))
                        )
                        if np.isnan(nodatavalue):
                            array = np.nan_to_num(array, nan=12345567)
                            count = dict(zip(*numpy.unique(array, return_counts=True)))
                            print("number of Nan pixels: " + str(count[12345567]))
                        else:
                            print("number of NoData pixels: " + str(count[nodatavalue]))
