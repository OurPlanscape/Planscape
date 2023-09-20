import numpy as np

from django.contrib.gis.gdal import GDALRaster
from django.test import TestCase
from forsys.raster_merger import RasterMerger


class RasterMergerTest(TestCase):
    def test_initializes_valid_raster(self) -> None:
        merger = RasterMerger(self._create_valid_raster())
        self._assert_raster_equals(merger.merged_raster, self._create_valid_raster())

    def test_adds_valid_raster(self) -> None:
        merger = RasterMerger()
        self.assertIsNone(merger.merged_raster)
        merger.add_raster(self._create_valid_raster())
        self._assert_raster_equals(merger.merged_raster, self._create_valid_raster())

    def test_fails_to_initialize_raster_with_bad_skew(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [1, 1],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        with self.assertRaises(Exception) as context:
            RasterMerger(raster)
        self.assertEqual(
            str(context.exception),
            "invalid raster skew, [1.000000, 1.000000] (expected [0, 0])",
        )

    def test_fails_to_add_raster_with_bad_skew(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [1, 1],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger()
        with self.assertRaises(Exception) as context:
            merger.add_raster(raster)
        self.assertEqual(
            str(context.exception),
            "invalid raster skew, [1.000000, 1.000000] (expected [0, 0])",
        )

    def test_fails_to_initialize_raster_with_no_bands(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [],
            }
        )
        with self.assertRaises(Exception) as context:
            RasterMerger(raster)
        self.assertEqual(
            str(context.exception), "invalid raster has 0 bands (expected 1)"
        )

    def test_fails_to_add_raster_with_no_bands(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [],
            }
        )
        merger = RasterMerger()
        with self.assertRaises(Exception) as context:
            merger.add_raster(raster)
        self.assertEqual(
            str(context.exception), "invalid raster has 0 bands (expected 1)"
        )

    def test_fails_to_initialize_raster_with_gt1_bands(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    },
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    },
                ],
            }
        )
        with self.assertRaises(Exception) as context:
            RasterMerger(raster)
        self.assertEqual(
            str(context.exception), "invalid raster has 2 bands (expected 1)"
        )

    def test_fails_to_add_raster_with_gt1_bands(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    },
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    },
                ],
            }
        )
        merger = RasterMerger()
        with self.assertRaises(Exception) as context:
            merger.add_raster(raster)
        self.assertEqual(
            str(context.exception), "invalid raster has 2 bands (expected 1)"
        )

    def test_fails_to_initialize_raster_with_bad_novalue(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": 0,
                    }
                ],
            }
        )
        with self.assertRaises(Exception) as context:
            merger = RasterMerger(raster)
        self.assertEqual(
            str(context.exception),
            "invalid raster has nodata value, 0.0 (expected np.nan)",
        )

    def test_fails_to_add_raster_with_bad_novalue(self) -> None:
        raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": 0,
                    }
                ],
            }
        )
        merger = RasterMerger()
        with self.assertRaises(Exception) as context:
            merger.add_raster(raster)
        self.assertEqual(
            str(context.exception),
            "invalid raster has nodata value, 0.0 (expected np.nan)",
        )

    def test_merges_rasters_in_place(self):
        r1 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        r2 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger(r1)
        merger.add_raster(r2)
        expected_merged_raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        self._assert_raster_equals(merger.merged_raster, expected_merged_raster)

    def test_merges_rasters_with_different_origins_x(self):
        r1 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        r2 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [410, 15],
                "bands": [
                    {
                        "data": (
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger(r1)
        merger.add_raster(r2)
        expected_merged_raster = GDALRaster(
            {
                "srid": 4326,
                "width": 8,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7,
                            8,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            9,
                            10,
                            11,
                            12,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            13,
                            14,
                            15,
                            16,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        self._assert_raster_equals(merger.merged_raster, expected_merged_raster)

    def test_merges_rasters_with_different_origins_y(self):
        r1 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        r2 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, -385],
                "bands": [
                    {
                        "data": (
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger(r1)
        merger.add_raster(r2)
        expected_merged_raster = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 8,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        self._assert_raster_equals(merger.merged_raster, expected_merged_raster)

    def test_fails_to_add_raster_with_different_srid(self):
        r1 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        r2 = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger(r1)
        with self.assertRaises(Exception) as context:
            merger.add_raster(r2)
        self.assertEqual(
            str(context.exception),
            "invalid raster srid, 9822 (expected original srid, 4326)",
        )

    def test_fails_to_add_raster_with_different_scale(self):
        r1 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        r2 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [10, -10],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger(r1)
        with self.assertRaises(Exception) as context:
            merger.add_raster(r2)
        self.assertEqual(
            str(context.exception),
            "invalid raster scale, [10.000000, -10.000000] "
            + "(expected original scale, [100.000000, -100.000000])",
        )

    def test_fails_to_add_overlapping_raster(self):
        r1 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        r2 = GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (
                            1,
                            2,
                            3,
                            4,
                            1,
                            2,
                            3,
                            4,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                            np.nan,
                        ),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        merger = RasterMerger(r1)
        with self.assertRaises(Exception) as context:
            merger.add_raster(r2)
        self.assertEqual(
            str(context.exception),
            "4 overlapping elements were detected "
            + "between the raster to be added and the merged raster",
        )

    def _create_valid_raster(self) -> GDALRaster:
        return GDALRaster(
            {
                "srid": 4326,
                "width": 4,
                "height": 4,
                "scale": [100, -100],
                "skew": [0, 0],
                "origin": [10, 15],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )

    def _assert_raster_equals(self, r1: GDALRaster, r2: GDALRaster) -> None:
        self.assertEquals(r1.srid, r2.srid)
        self.assertEquals(r1.scale, r2.scale)
        self.assertEquals(r1.origin, r2.origin)
        self.assertEquals(r1.width, r2.width)
        self.assertEquals(r1.height, r2.height)
        self.assertEquals(len(r1.bands), 1)
        self.assertEquals(len(r2.bands), 1)
        self.assertIsNone(
            np.testing.assert_array_equal(r1.bands[0].data(), r2.bands[0].data())
        )
