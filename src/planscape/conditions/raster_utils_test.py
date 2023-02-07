import numpy as np
from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition
from conditions.raster_condition_retrieval_testcase import \
    RasterConditionRetrievalTestCase
from conditions.raster_utils import (compute_condition_score_from_raster,
                                     fetch_or_compute_mean_condition_scores)
from django.contrib.gis.geos import MultiPolygon, Polygon
from plan.models import ConditionScores, Plan


class MeanConditionScoreTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

    def test_returns_score(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._create_condition_raster(
            self, foo_raster, "foo")
        score = compute_condition_score_from_raster(geo, "foo")
        self.assertEqual(score, 36.0 / 8)

    def test_fails_for_missing_geo(self):
        with self.assertRaises(Exception) as context:
            compute_condition_score_from_raster(None, "foo")
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
            compute_condition_score_from_raster(geo, "foo")
        self.assertIn(
            "invalid geo: Self-intersection[", str(context.exception))

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
            compute_condition_score_from_raster(geo, "foo")
        self.assertEqual(
            str(context.exception), "geometry SRID is 4269 (expected 9822)")

    def test_returns_none_for_no_intersection(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 7, 10, 0, 1)
        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        RasterConditionRetrievalTestCase._create_condition_raster(
            self, foo_raster, "foo")
        score = compute_condition_score_from_raster(geo, "foo")
        self.assertIsNone(score)

    def test_fails_for_missing_raster(self):
        geo = RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        with self.assertRaises(Exception) as context:
            compute_condition_score_from_raster(
                geo, "nonexistent_raster_name")
        self.assertEqual(
            str(context.exception),
            "no rasters available for raster_name, nonexistent_raster_name")


class AllMeanConditionScoresTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

    def test_computes_mean_scores(self):
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

        scores = fetch_or_compute_mean_condition_scores(plan)

        self.assertDictEqual(
            scores, {"foo": 36.0 / 8, "bar": 100.0 / 8, "baz": 10.0 / 2})
        self.assertEqual(len(ConditionScores.objects.all()), 3)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=foo_id).mean_score, 36.0 / 8)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=bar_id).mean_score, 100.0 / 8)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=baz_id).mean_score, 10.0 / 2)

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
            fetch_or_compute_mean_condition_scores(plan)
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
            fetch_or_compute_mean_condition_scores(plan)
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
            fetch_or_compute_mean_condition_scores(plan)
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
            fetch_or_compute_mean_condition_scores(plan)
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

        scores = fetch_or_compute_mean_condition_scores(plan)

        self.assertDictEqual(scores, {"foo": None})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=foo_id).mean_score, None)

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

        scores = fetch_or_compute_mean_condition_scores(plan)

        self.assertDictEqual(scores, {"foo": None})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=foo_id).mean_score, None)

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

        scores = fetch_or_compute_mean_condition_scores(plan)

        self.assertDictEqual(scores, {"foo": None})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=foo_id).mean_score, None)

    def test_retrieves_mean_scores(self):
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
            plan=plan, condition_id=foo_id, mean_score=5.0)
        ConditionScores.objects.create(
            plan=plan, condition_id=bar_id, mean_score=None)

        scores = fetch_or_compute_mean_condition_scores(plan)
        self.assertDictEqual(scores, {"foo": 5.0, "bar": None})
