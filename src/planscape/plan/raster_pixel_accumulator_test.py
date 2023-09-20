import numpy as np

from django.contrib.gis.gdal import (
    CoordTransform,
    GDALRaster,
    OGRGeometry,
    SpatialReference,
)
from django.contrib.gis.geos import Polygon
from django.test import TestCase
from plan.raster_pixel_accumulator import RasterPixelAccumulator


class RasterPixelAccumulatorTest(TestCase):
    def test_inits_geo_in_specified_srs(self) -> None:
        polygon = Polygon(((-121, 39), (-121, 40), (-120, 40), (-120, 39), (-121, 39)))
        polygon.srid = 4269
        accumulator = RasterPixelAccumulator(polygon)
        geo = accumulator.geo
        geo.transform(CoordTransform(accumulator.RASTER_SR, SpatialReference(4269)))
        self.assertEquals(geo.srid, 4269)
        self._assert_tuples_almost_equal(geo.coords, polygon.coords)

    def test_updates_initialized_geo(self) -> None:
        polygon1 = Polygon(((-121, 39), (-121, 40), (-120, 40), (-120, 39), (-121, 39)))
        polygon1.srid = 4269
        polygon2 = Polygon(((-120, 39), (-120, 40), (-119, 40), (-119, 39), (-120, 39)))
        polygon2.srid = 4269
        accumulator = RasterPixelAccumulator(polygon1)
        accumulator.init_geo(polygon2)
        geo = accumulator.geo
        geo.transform(CoordTransform(accumulator.RASTER_SR, SpatialReference(4269)))
        self.assertEquals(geo.srid, 4269)
        self._assert_tuples_almost_equal(geo.coords, polygon2.coords)

    def test_ignores_raster_outside_limits_x(self) -> None:
        accumulator = self._set_up_accumulator_with_coordinates(
            (
                (-2117, 2100954),
                (-2117, 2100654),
                (-2118, 2100654),
                (-2118, 2100954),
                (-2117, 2100954),
            )
        )
        raster = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [300, -300],
                "skew": [0, 0],
                "origin": [-2116971, 2100954],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        accumulator.process_raster(raster, "foo")
        self.assertDictEqual(accumulator.stats, {"foo": {"sum": 0, "count": 0}})

    def test_ignores_raster_outside_limits_y(self) -> None:
        accumulator = self._set_up_accumulator_with_coordinates(
            (
                (-2116971, 2101),
                (-2116971, 2102),
                (-2116371, 2102),
                (-2116371, 2101),
                (-2116971, 2101),
            )
        )
        raster = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [300, -300],
                "skew": [0, 0],
                "origin": [-2116971, 2100954],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        accumulator.process_raster(raster, "foo")
        self.assertDictEqual(accumulator.stats, {"foo": {"sum": 0, "count": 0}})

    def test_accumulates_raster_stats_for_raster_within_geo(self) -> None:
        accumulator = self._set_up_accumulator_with_coordinates(
            (
                (-2116971, 2100954),
                (-2116971, 2000000),
                (-2115000, 2000000),
                (-2115000, 2100954),
                (-2116971, 2100954),
            )
        )
        raster = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [300, -300],
                "skew": [0, 0],
                "origin": [-2116971, 2100954],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        accumulator.process_raster(raster, "foo")
        self.assertDictEqual(accumulator.stats, {"foo": {"sum": 136, "count": 16}})

    def test_accumulates_raster_stats_for_geo_within_raster(self) -> None:
        accumulator = self._set_up_accumulator_with_coordinates(
            (
                (-2116971, 2100954),
                (-2116971, 2100654),
                (-2116371, 2100654),
                (-2116371, 2100954),
                (-2116971, 2100954),
            )
        )
        raster = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [300, -300],
                "skew": [0, 0],
                "origin": [-2116971, 2100954],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        accumulator.process_raster(raster, "foo")
        self.assertDictEqual(accumulator.stats, {"foo": {"sum": 24, "count": 6}})

    def test_skips_nan_values_in_raster(self) -> None:
        accumulator = self._set_up_accumulator_with_coordinates(
            (
                (-2116971, 2100954),
                (-2116971, 2100654),
                (-2116371, 2100654),
                (-2116371, 2100954),
                (-2116971, 2100954),
            )
        )
        raster = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [300, -300],
                "skew": [0, 0],
                "origin": [-2116971, 2100954],
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
        accumulator.process_raster(raster, "foo")
        self.assertDictEqual(accumulator.stats, {"foo": {"sum": 18, "count": 3}})

    def test_resets_raster_statistics(self) -> None:
        accumulator = self._set_up_accumulator_with_coordinates(
            (
                (-2116971, 2100954),
                (-2116971, 2100654),
                (-2116371, 2100654),
                (-2116371, 2100954),
                (-2116971, 2100954),
            )
        )
        raster = GDALRaster(
            {
                "srid": 9822,
                "width": 4,
                "height": 4,
                "scale": [300, -300],
                "skew": [0, 0],
                "origin": [-2116971, 2100954],
                "bands": [
                    {
                        "data": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
                        "nodata_value": np.nan,
                    }
                ],
            }
        )
        accumulator.process_raster(raster, "foo")
        accumulator.reset_stats()
        self.assertDictEqual(accumulator.stats, {})

    def _assert_tuples_almost_equal(self, t1, t2) -> None:
        self.assertEquals(len(t1), len(t2))
        for i in range(len(t1)):
            self.assertEquals(type(t1[i]), type(t2[i]))
            if type(t1[i]) is tuple:
                self._assert_tuples_almost_equal(t1[i], t2[i])
            else:
                self.assertAlmostEqual(t1[i], t2[i])

    # A roundabout way to set up an accumulaator with desired geo coordinates.
    # This is necesesary because 1) the raster SR cannot be described with an
    # SRID and 2) moving from the default srid to the raster SR involves
    # non-zero skew.
    def _set_up_accumulator_with_coordinates(
        self, coords: tuple
    ) -> RasterPixelAccumulator:
        throwaway_polygon = Polygon(((-121, 39), (-121, 40), (-120, 40), (-121, 39)))
        throwaway_polygon.srid = 4269
        accumulator = RasterPixelAccumulator(throwaway_polygon)
        accumulator.geo.pop()
        accumulator.geo[0] = coords
        return accumulator
