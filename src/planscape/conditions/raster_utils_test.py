import numpy as np

from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition, ConditionRaster
from conditions.raster_utils import get_mean_condition_scores
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.geos import Polygon
from django.test import TestCase
from planscape import settings


class MeanConditionScoresTest(TestCase):
    def setUp(self):
        self.region = 'sierra_cascade_inyo'

        self.xorig = -2116971
        self.yorig = 2100954
        self.xscale = 300
        self.yscale = -300

    def test_gets_mean_scores(self):
        geo = self._create_geo(0, 3, 0, 1)

        foo_raster = self._create_raster(4, 4, (1, 2, 3, 4,
                                                5, 6, 7, 8,
                                                9, 10, 11, 12,
                                                13, 14, 15, 16))
        self._create_db("foo", "foo_normalized", foo_raster)

        bar_raster = self._create_raster(4, 4, (9, 10, 11, 12,
                                                13, 14, 15, 16,
                                                1, 2, 3, 4,
                                                5, 6, 7, 8))
        self._create_db("bar", "bar_normalized", bar_raster)

        baz_raster = self._create_raster(4, 4, (np.nan, np.nan, np.nan, 3,
                                                np.nan, np.nan, 7, np.nan,
                                                1, 2, 3, 4,
                                                5, 6, 7, 8))
        self._create_db("baz", "baz_normalized", baz_raster)

        scores = get_mean_condition_scores(geo, self.region)

        self.assertDictEqual(
            scores, {"foo": 36.0 / 8, "bar": 100.0 / 8, "baz": 10.0 / 2})

    def test_gets_no_score_for_no_values(self):
        geo = self._create_geo(0, 3, 0, 1)

        raster = self._create_raster(4, 4, (np.nan, np.nan, np.nan, np.nan,
                                            np.nan, np.nan, np.nan, np.nan,
                                            9, 10, 11, 12,
                                            13, 14, 15, 16))

        self._create_db("foo", "foo_normalized", raster)

        scores = get_mean_condition_scores(geo, self.region)

        self.assertDictEqual(scores, {"foo": None})

    def test_gets_no_score_for_no_intersection(self):
        geo = self._create_geo(6, 10, 0, 1)

        raster = self._create_raster(4, 4, (1, 2, 3, 4,
                                            5, 6, 7, 8,
                                            9, 10, 11, 12,
                                            13, 14, 15, 16))

        self._create_db("foo", "foo_normalized", raster)

        scores = get_mean_condition_scores(geo, self.region)

        self.assertDictEqual(scores, {"foo": None})

    def test_fails_on_bad_geometry(self):
        geo = self._create_geo(0, 3, 0, 1)
        geo.srid = 4269

        raster = self._create_raster(4, 4, (1, 2, 3, 4,
                                            5, 6, 7, 8,
                                            9, 10, 11, 12,
                                            13, 14, 15, 16))

        self._create_db("foo", "foo_normalized", raster)

        with self.assertRaises(Exception) as context:
            get_mean_condition_scores(geo, self.region)
        self.assertEqual(
            str(context.exception),
            "geometry has SRID, 4269 (expectd %d)" %
            (settings.CRS_FOR_RASTERS))

    def _create_geo(
            self, xmin: int, xmax: int, ymin: int, ymax: int) -> Polygon:
        # ST_Clip seems to include pixels up to round((coord-origin)/scale) - 1.
        buffer = 0.6

        geo = Polygon(
            ((self.xorig + xmin*self.xscale, self.yorig + ymin*self.yscale),
             (self.xorig + xmin*self.xscale,
                self.yorig + (ymax + buffer) * self.yscale),
             (self.xorig + (xmax + buffer) * self.xscale,
                self.yorig + (ymax + buffer) * self.yscale),
             (self.xorig + (xmax + buffer) * self.xscale,
                self.yorig + ymin*self.yscale),
             (self.xorig + xmin*self.xscale, self.yorig + ymin*self.yscale)))
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

    def _create_db(self, condition_name: str, condition_raster_name: str,
                   condition_raster: GDALRaster):
        base_condition = BaseCondition.objects.create(
            condition_name=condition_name, region_name=self.region,
            condition_level=ConditionLevel.METRIC)
        Condition.objects.create(
            raster_name=condition_raster_name,
            condition_dataset=base_condition, is_raw=False)
        ConditionRaster.objects.create(
            name=condition_raster_name, raster=condition_raster)
