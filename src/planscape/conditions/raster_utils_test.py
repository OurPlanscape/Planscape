import numpy as np
from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition
from conditions.raster_condition_retrieval_testcase import (
    RasterConditionRetrievalTestCase,
)
from conditions.raster_utils import (
    compute_condition_stats_from_raster,
    get_condition_values_from_raster,
)
from django.contrib.gis.geos import MultiPolygon, Polygon


class ConditionStatsTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)
        )
        RasterConditionRetrievalTestCase._create_condition_raster(
            self, foo_raster, "foo"
        )

    def test_returns_stats(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        stats = compute_condition_stats_from_raster(geo, "foo")
        self.assertDictEqual(stats, {"mean": 36.0 / 8, "sum": 36.0, "count": 8})

    def test_fails_for_missing_geo(self):
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(None, "foo")
        self.assertEqual(str(context.exception), "missing input geometry")

    def test_fails_for_invalid_geo(self):
        polygon = Polygon(
            ((-120, 40), (-120, 41), (-121, 41), (-121, 39), (-120, 42), (-120, 40))
        )
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(geo, "foo")
        self.assertRegex(str(context.exception), r"invalid geo: .*Self-intersection\[")

    def test_fails_for_wrong_srid(self):
        polygon = Polygon(((-120, 40), (-120, 41), (-121, 41), (-121, 40), (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(geo, "foo")
        self.assertEqual(
            str(context.exception), "geometry SRID is 4269 (expected 3857)"
        )

    def test_returns_stats_for_no_intersection(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 7, 10, 0, 1)
        stats = compute_condition_stats_from_raster(geo, "foo")
        self.assertDictEqual(stats, {"mean": None, "sum": 0.0, "count": 0.0})

    def test_fails_for_missing_raster(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(geo, "nonexistent_raster_name")
        self.assertEqual(
            str(context.exception),
            "no rasters available for raster_name, nonexistent_raster_name",
        )


class ConditionPixelsTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)
        )
        RasterConditionRetrievalTestCase._create_condition_raster(
            self, foo_raster, "foo"
        )

    def test_returns_pixels(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        values = get_condition_values_from_raster(geo, "foo")
        self.assertAlmostEqual(values["upper_left_coord_x"], -2116971)
        self.assertAlmostEqual(values["upper_left_coord_y"], 2100954)
        self.assertListEqual(values["pixel_dist_x"], [0, 1, 2, 3, 0, 1, 2, 3])
        self.assertListEqual(values["pixel_dist_y"], [0, 0, 0, 0, 1, 1, 1, 1])
        self.assertListEqual(values["values"], [1, 2, 3, 4, 5, 6, 7, 8])

    def test_returns_pixels_for_intersection(self):
        # The geo spans beyond raster values.
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 10, -2, 1)
        values = get_condition_values_from_raster(geo, "foo")
        self.assertAlmostEqual(values["upper_left_coord_x"], -2116971)
        self.assertAlmostEqual(values["upper_left_coord_y"], 2100954)
        self.assertListEqual(values["pixel_dist_x"], [0, 1, 2, 3, 0, 1, 2, 3])
        self.assertListEqual(values["pixel_dist_y"], [0, 0, 0, 0, 1, 1, 1, 1])
        self.assertListEqual(values["values"], [1, 2, 3, 4, 5, 6, 7, 8])

    def test_fails_for_missing_geo(self):
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(None, "foo")
        self.assertEqual(str(context.exception), "missing input geometry")

    def test_fails_for_invalid_geo(self):
        polygon = Polygon(
            ((-120, 40), (-120, 41), (-121, 41), (-121, 39), (-120, 42), (-120, 40))
        )
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(geo, "foo")
        self.assertRegex(str(context.exception), r"invalid geo: .*Self-intersection\[")

    def test_fails_for_wrong_srid(self):
        polygon = Polygon(((-120, 40), (-120, 41), (-121, 41), (-121, 40), (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(geo, "foo")
        self.assertEqual(
            str(context.exception), "geometry SRID is 4269 (expected 3857)"
        )

    def test_returns_pixel_values_for_no_intersection(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 7, 10, 0, 1)
        values = get_condition_values_from_raster(geo, "foo")
        self.assertIsNone(values)

    def test_fails_for_missing_raster(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(geo, "nonexistent_raster_name")
        self.assertEqual(
            str(context.exception),
            "no rasters available for raster_name, nonexistent_raster_name",
        )
