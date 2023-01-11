import numpy as np

from django.contrib.gis.gdal import GDALRaster
from django.test import TestCase
from forsys.raster_merger import RasterMerger


class RasterMergerTest(TestCase):
    def test_initializes_valid_raster(self) -> None:
        merger = RasterMerger(self._create_default_raster())
        self._assert_raster_equals(
            merger.merged_raster, self._create_default_raster())

    def test_adds_valid_raster(self) -> None:
        merger = RasterMerger()
        self.assertIsNone(merger.merged_raster)
        merger.add_raster(self._create_default_raster())
        self._assert_raster_equals(
            merger.merged_raster, self._create_default_raster())

    def _create_default_raster(self) -> GDALRaster:
        return GDALRaster({
            'srid': 4326,
            'width': 4,
            'height': 4,
            'scale': [100, -100],
            'skew': [0, 0],
            'origin': [10, 15],
            'bands': [{
                'data': (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16),
                'nodata_value': np.nan
            }]
        })

    def _assert_raster_equals(self, r1: GDALRaster, r2: GDALRaster) -> None:
        self.assertEquals(r1.srid, r2.srid)
        self.assertEquals(r1.scale, r2.scale)
        self.assertEquals(r1.origin, r2.origin)
        self.assertEquals(len(r1.bands), 1)
        self.assertEquals(len(r2.bands), 1)
        self.assertIsNone(
            np.testing.assert_array_equal(
                r1.bands[0].data(),
                r2.bands[0].data()))
