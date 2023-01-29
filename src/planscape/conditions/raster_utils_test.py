import json
import numpy as np

from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition, ConditionRaster
from conditions.raster_utils import (
    compute_condition_score_from_raster,
    fetch_or_compute_mean_condition_scores)
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.db import connection
from django.test import TestCase
from plan.models import Plan, ConditionScores
from planscape import settings


def _create_geo(
        self, xmin: int, xmax: int, ymin: int, ymax: int) -> MultiPolygon:
    # ST_Clip seems to include pixels up to round((coord-origin)/scale) - 1.
    buffer = 0.6

    polygon = Polygon(
        ((self.xorig + xmin*self.xscale, self.yorig + ymin*self.yscale),
            (self.xorig + xmin*self.xscale,
             self.yorig + (ymax + buffer) * self.yscale),
            (self.xorig + (xmax + buffer) * self.xscale,
             self.yorig + (ymax + buffer) * self.yscale),
            (self.xorig + (xmax + buffer) * self.xscale,
             self.yorig + ymin*self.yscale),
            (self.xorig + xmin*self.xscale, self.yorig + ymin*self.yscale)))
    geo = MultiPolygon(polygon)
    geo.srid = settings.CRS_FOR_RASTERS
    return geo


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


def _create_condition_raster(
        condition_raster: GDALRaster, condition_raster_name: str):
    ConditionRaster.objects.create(
        name=condition_raster_name, raster=condition_raster)


def _create_condition_db(self, condition_name: str,
                         condition_raster_name: str,
                         condition_raster: GDALRaster) -> int:
    base_condition = BaseCondition.objects.create(
        condition_name=condition_name, region_name=self.region,
        condition_level=ConditionLevel.METRIC)
    condition = Condition.objects.create(
        raster_name=condition_raster_name,
        condition_dataset=base_condition, is_raw=False)
    _create_condition_raster(condition_raster, condition_raster_name)
    return condition.pk


class MeanConditionScoreTest(TestCase):
    def setUp(self):
        # Add a row for CRS 9822 to the spatial_ref_sys table, and the GeoTiff to the table.
        with connection.cursor() as cursor:
            query = ("insert into spatial_ref_sys(srid, proj4text) values(9822, '{}')").format(
                settings.CRS_9822_PROJ4)
            cursor.execute(query)

        self.xorig = -2116971
        self.yorig = 2100954
        self.xscale = 300
        self.yscale = -300

    def test_returns_score(self):
        geo = _create_geo(self, 0, 3, 0, 1)
        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        _create_condition_raster(foo_raster, "foo")
        score = compute_condition_score_from_raster(geo, "foo")
        self.assertEqual(score, 36.0 / 8)

    def test_returns_none_for_no_geo(self):
        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        _create_condition_raster(foo_raster, "foo")
        score = compute_condition_score_from_raster(None, "foo")
        self.assertIsNone(score)

    def test_fails_wrong_srid(self):
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
        geo = _create_geo(self, 7, 10, 0, 1)
        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        _create_condition_raster(foo_raster, "foo")
        score = compute_condition_score_from_raster(geo, "foo")
        self.assertIsNone(score)

    def test_returns_none_for_no_raster(self):
        geo = _create_geo(self, 0, 3, 0, 1)
        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        _create_condition_raster(foo_raster, "foo")
        score = compute_condition_score_from_raster(
            geo, "nonexistent_raster_name")
        self.assertIsNone(score)


class MeanConditionScoresTest(TestCase):
    def setUp(self):
        # Add a row for CRS 9822 to the spatial_ref_sys table, and the GeoTiff to the table.
        with connection.cursor() as cursor:
            query = ("insert into spatial_ref_sys(srid, proj4text) values(9822, '{}')").format(
                settings.CRS_9822_PROJ4)
            cursor.execute(query)

        self.region = 'sierra_cascade_inyo'

        self.xorig = -2116971
        self.yorig = 2100954
        self.xscale = 300
        self.yscale = -300

    def test_computes_mean_scores(self):
        geo = _create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        foo_id = _create_condition_db(
            self, "foo", "foo_normalized", foo_raster)

        bar_raster = _create_raster(self, 4, 4, (9, 10, 11, 12,
                                                 13, 14, 15, 16,
                                                 1, 2, 3, 4,
                                                 5, 6, 7, 8))
        bar_id = _create_condition_db(
            self, "bar", "bar_normalized", bar_raster)

        baz_raster = _create_raster(self, 4, 4, (np.nan, np.nan, np.nan, 3,
                                                 np.nan, np.nan, 7, np.nan,
                                                 1, 2, 3, 4,
                                                 5, 6, 7, 8))
        baz_id = _create_condition_db(
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

        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        _create_condition_db(self, "foo", "foo_normalized", foo_raster)
        with self.assertRaises(Exception) as context:
            fetch_or_compute_mean_condition_scores(plan)
        self.assertEqual(
            str(context.exception), "plan is missing geometry")

    def test_raises_error_for_bad_region(self):
        geo = _create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(
            geometry=geo, region_name="nonsensical region")

        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        _create_condition_db(self, "foo", "foo_normalized", foo_raster)
        with self.assertRaises(Exception) as context:
            fetch_or_compute_mean_condition_scores(plan)
        self.assertEqual(
            str(context.exception),
            "no conditions exist for region, nonsensical region")

    def test_computes_no_score_for_nodata_values(self):
        geo = _create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        raster = _create_raster(self, 4, 4, (np.nan, np.nan, np.nan, np.nan,
                                             np.nan, np.nan, np.nan, np.nan,
                                             9, 10, 11, 12,
                                             13, 14, 15, 16))

        foo_id = _create_condition_db(self, "foo", "foo_normalized", raster)

        scores = fetch_or_compute_mean_condition_scores(plan)

        self.assertDictEqual(scores, {"foo": None})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=foo_id).mean_score, None)

    def test_computes_no_score_for_no_intersection(self):
        geo = _create_geo(self, 6, 10, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                             5, 6, 7, 8,
                                             9, 10, 11, 12,
                                             13, 14, 15, 16))

        foo_id = _create_condition_db(self, "foo", "foo_normalized", raster)

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

        raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                             5, 6, 7, 8,
                                             9, 10, 11, 12,
                                             13, 14, 15, 16))

        foo_id = _create_condition_db(self, "foo", "foo_normalized", raster)

        scores = fetch_or_compute_mean_condition_scores(plan)

        self.assertDictEqual(scores, {"foo": None})
        self.assertEqual(len(ConditionScores.objects.all()), 1)
        self.assertEqual(ConditionScores.objects.get(
            condition_id=foo_id).mean_score, None)

    def test_retrieves_mean_scores(self):
        geo = _create_geo(self, 0, 3, 0, 1)
        plan = Plan.objects.create(geometry=geo, region_name=self.region)

        foo_raster = _create_raster(self, 4, 4, (1, 2, 3, 4,
                                                 5, 6, 7, 8,
                                                 9, 10, 11, 12,
                                                 13, 14, 15, 16))
        foo_id = _create_condition_db(
            self, "foo", "foo_normalized", foo_raster)

        bar_raster = _create_raster(self, 4, 4, (9, 10, 11, 12,
                                                 13, 14, 15, 16,
                                                 1, 2, 3, 4,
                                                 5, 6, 7, 8))
        bar_id = _create_condition_db(
            self, "bar", "bar_normalized", bar_raster)

        ConditionScores.objects.create(
            plan=plan, condition_id=foo_id, mean_score=5.0)
        ConditionScores.objects.create(
            plan=plan, condition_id=bar_id, mean_score=None)

        scores = fetch_or_compute_mean_condition_scores(plan)
        self.assertDictEqual(scores, {"foo": 5.0, "bar": None})
