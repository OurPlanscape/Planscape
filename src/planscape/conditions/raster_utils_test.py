import numpy as np
from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition
from conditions.raster_condition_retrieval_testcase import \
    RasterConditionRetrievalTestCase
from conditions.raster_utils import (compute_condition_stats_from_raster,
                                     fetch_or_compute_condition_stats,
                                     get_condition_values_from_raster)
from django.contrib.gis.geos import MultiPolygon, Polygon
from plan.models import ConditionScores, Plan


class ConditionStatsTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._create_condition_raster(
            self, foo_raster, "foo")

    def test_returns_stats(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        stats = compute_condition_stats_from_raster(geo, "foo")
        self.assertDictEqual(
            stats, {'mean': 36.0 / 8, 'sum': 36.0, 'count': 8})

    def test_fails_for_missing_geo(self):
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(None, "foo")
        self.assertEqual(
            str(context.exception), "missing input geometry")

    def test_fails_for_invalid_geo(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 39),
             (-120, 42),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(geo, "foo")
        self.assertRegex(str(context.exception),
                         'invalid geo: .*Self-intersection[')

    def test_fails_for_wrong_srid(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 40),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(geo, "foo")
        self.assertEqual(
            str(context.exception), "geometry SRID is 4269 (expected 3857)")

    def test_returns_stats_for_no_intersection(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 7, 10, 0, 1)
        stats = compute_condition_stats_from_raster(geo, "foo")
        self.assertDictEqual(stats, {'mean': None, 'sum': 0.0, 'count': 0.0})

    def test_fails_for_missing_raster(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        with self.assertRaises(Exception) as context:
            compute_condition_stats_from_raster(
                geo, "nonexistent_raster_name")
        self.assertEqual(
            str(context.exception),
            "no rasters available for raster_name, nonexistent_raster_name")


class AllConditionStatsTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

    def test_computes_stats(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        foo_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)

        bar_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (9, 10, 11, 12,
                         13, 14, 15, 16,
                         1, 2, 3, 4,
                         5, 6, 7, 8))
        bar_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "bar", "bar_normalized", bar_raster)

        baz_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4,
            (np.nan, np.nan, np.nan, 3,
             np.nan, np.nan, 7, np.nan,
             1, 2, 3, 4,
             5, 6, 7, 8))
        baz_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "baz", "baz_normalized", baz_raster)

        scores = fetch_or_compute_condition_stats(plan)

        self.assertDictEqual(
            scores, {"foo": {"mean": 36.0 / 8, "sum": 36.0, "count": 8},
                     "bar": {"mean": 100.0 / 8, "sum": 100.0, "count": 8},
                     "baz": {"mean": 10.0 / 2, "sum": 10.0, "count": 2}})
        self.assertEqual(len(ConditionScores.objects.all()), 3)
        foo_condition = ConditionScores.objects.get(
            condition_id=foo_id)
        self.assertEqual(foo_condition.mean_score, 36.0 / 8)
        self.assertEqual(foo_condition.sum, 36.0)
        self.assertEqual(foo_condition.count, 8)
        bar_condition = ConditionScores.objects.get(
            condition_id=bar_id)
        self.assertEqual(bar_condition.mean_score, 100.0 / 8)
        self.assertEqual(bar_condition.sum, 100.0)
        self.assertEqual(bar_condition.count, 8)
        baz_condition = ConditionScores.objects.get(
            condition_id=baz_id)
        self.assertEqual(baz_condition.mean_score, 10.0 / 2)
        self.assertEqual(baz_condition.sum, 10.0)
        self.assertEqual(baz_condition.count, 2)

    def test_raises_error_for_missing_geo(self):
        plan = Plan.objects.create(geometry=None, region_name=self.region)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)
        with self.assertRaises(Exception) as context:
            fetch_or_compute_condition_stats(plan)
        self.assertEqual(
            str(context.exception), "plan is missing geometry")

    def test_raises_error_for_invalid_geo(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 39),
             (-120, 42),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)

        with self.assertRaises(Exception) as context:
            fetch_or_compute_condition_stats(plan)
        self.assertIn(
            "invalid geo: Self-intersection[", str(context.exception))

    def test_raises_error_for_missing_raster(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        base_condition = BaseCondition.objects.create(
            condition_name="foo", region_name=self.region,
            condition_level=ConditionLevel.METRIC)
        Condition.objects.create(
            raster_name="foo_normalized",
            condition_dataset=base_condition, is_raw=False)

        with self.assertRaises(Exception) as context:
            fetch_or_compute_condition_stats(plan)
        self.assertEqual(
            str(context.exception),
            "no rasters available for raster_name, foo_normalized")

    def test_raises_error_for_bad_region(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(
            geometry=geo, region_name="nonsensical region")

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)
        with self.assertRaises(Exception) as context:
            fetch_or_compute_condition_stats(plan)
        self.assertEqual(
            str(context.exception), "region, nonsensical region, is invalid")

    def test_computes_no_score_for_nodata_values(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4,
            (np.nan, np.nan, np.nan, np.nan,
             np.nan, np.nan, np.nan, np.nan,
             9, 10, 11, 12,
             13, 14, 15, 16))

        foo_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", raster)

        stats = fetch_or_compute_condition_stats(plan)

        self.assertDictEqual(
            stats, {"foo": {"mean": None, "sum": 0.0, "count": 0.0}})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        foo_condition = ConditionScores.objects.get(
            condition_id=foo_id)
        self.assertIsNone(foo_condition.mean_score)
        self.assertEqual(foo_condition.sum, 0.0)
        self.assertEqual(foo_condition.count, 0)

    def test_computes_no_score_for_no_intersection(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 6, 10, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))

        foo_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", raster)

        stats = fetch_or_compute_condition_stats(plan)

        self.assertDictEqual(
            stats, {"foo": {"mean": None, "sum": 0.0, "count": 0.0}})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        foo_condition = ConditionScores.objects.get(
            condition_id=foo_id)
        self.assertIsNone(foo_condition.mean_score)
        self.assertEqual(foo_condition.sum, 0.0)
        self.assertEqual(foo_condition.count, 0)

    def test_transforms_geo(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 40),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))

        foo_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", raster)

        stats = fetch_or_compute_condition_stats(plan)

        self.assertDictEqual(
            stats, {"foo": {"mean": None, "sum": 0.0, "count": 0.0}})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        foo_condition = ConditionScores.objects.get(
            condition_id=foo_id)
        self.assertIsNone(foo_condition.mean_score)
        self.assertEqual(foo_condition.sum, 0.0)
        self.assertEqual(foo_condition.count, 0)

    def test_retrieves_mean_scores_from_db(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        foo_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)

        bar_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (9, 10, 11, 12,
                         13, 14, 15, 16,
                         1, 2, 3, 4,
                         5, 6, 7, 8))
        bar_id = RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "bar", "bar_normalized", bar_raster)

        ConditionScores.objects.create(
            plan=plan, condition_id=foo_id, mean_score=5.0, sum=10.0, count=2)
        ConditionScores.objects.create(
            plan=plan, condition_id=bar_id, mean_score=None, sum=0.0, count=0)

        scores = fetch_or_compute_condition_stats(plan)
        self.assertDictEqual(
            scores, {"foo": {"mean": 5.0, "sum": 10.0, "count": 2},
                     "bar": {"mean": None, "sum": 0.0, "count": 0}})


class ConditionPixelsTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._create_condition_raster(
            self, foo_raster, "foo")

    def test_returns_pixels(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        values = get_condition_values_from_raster(geo, "foo")
        self.assertAlmostEqual(values['upper_left_coord_x'], -2116971)
        self.assertAlmostEqual(values['upper_left_coord_y'], 2100954)
        self.assertListEqual(values['pixel_dist_x'], [0, 1, 2, 3, 0, 1, 2, 3])
        self.assertListEqual(values['pixel_dist_y'], [0, 0, 0, 0, 1, 1, 1, 1])
        self.assertListEqual(values['values'], [1, 2, 3, 4, 5, 6, 7, 8])

    def test_returns_pixels_for_intersection(self):
        # The geo spans beyond raster values.
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 10, -2, 1)
        values = get_condition_values_from_raster(geo, "foo")
        self.assertAlmostEqual(values['upper_left_coord_x'], -2116971)
        self.assertAlmostEqual(values['upper_left_coord_y'], 2100954)
        self.assertListEqual(values['pixel_dist_x'], [0, 1, 2, 3, 0, 1, 2, 3])
        self.assertListEqual(values['pixel_dist_y'], [0, 0, 0, 0, 1, 1, 1, 1])
        self.assertListEqual(values['values'], [1, 2, 3, 4, 5, 6, 7, 8])

    def test_fails_for_missing_geo(self):
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(None, "foo")
        self.assertEqual(
            str(context.exception), "missing input geometry")

    def test_fails_for_invalid_geo(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 39),
             (-120, 42),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(geo, "foo")
        self.assertRegex(str(context.exception),
                         r'invalid geo: .*Self-intersection[')

    def test_fails_for_wrong_srid(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 40),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_condition_values_from_raster(geo, "foo")
        self.assertEqual(
            str(context.exception), "geometry SRID is 4269 (expected 3857)")

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
            "no rasters available for raster_name, nonexistent_raster_name")
