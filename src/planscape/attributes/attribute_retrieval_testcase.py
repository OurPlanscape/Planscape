import numpy as np

from attributes.models import Attribute, AttributeRaster
from conditions.raster_condition_retrieval_testcase import RasterRetrievalTestCase
from django.contrib.gis.gdal import GDALRaster
from planscape import settings


class RasterAttributeRetrievalTestCase(RasterRetrievalTestCase):
    def setUp(self) -> None:
        RasterRetrievalTestCase.setUp(self)

    def _create_raster(
            self, width: int, height: int, data: tuple) -> GDALRaster:
        raster = GDALRaster({
            'srid': settings.CRS_FOR_RASTERS,
            'width': width,
            'height': height,
            'scale': [self.xscale, self.yscale],
            'skew': [0, 0],
            'origin': [self.xorig, self.yorig],
            'bands': [{
                'data': data,
                'nodata_value': np.nan
            }]
        })
        return raster

    def _create_attribute_raster(
            self, attribute_raster: GDALRaster,
            attribute_raster_name: str) -> None:
        AttributeRaster.objects.create(
            name=attribute_raster_name, raster=attribute_raster)

    def _save_attribute_to_db(self, attribute_name: str,
                              attribute_raster_name: str,
                              attribute_raster: GDALRaster) -> int:
        attribute = Attribute.objects.create(attribute_name=attribute_name)
        self._create_attribute_raster(attribute_raster, attribute_raster_name)
        return attribute.pk
