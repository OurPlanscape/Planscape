import numpy as np

from django.test import TestCase
from conditions.raster_condition_retrieval_testcase import \
    RasterConditionRetrievalTestCase
from conditions.models import BaseCondition, Condition
from base.condition_types import ConditionLevel
from forsys.raster_condition_fetcher import (
    get_conditions, RasterConditionFetcher)
from forsys.assert_dict_almost_equal import assert_dict_almost_equal


class GetConditionsTest(TestCase):
    def setUp(self):
        foo_base_condition = BaseCondition.objects.create(
            condition_name="foo", region_name="my_region",
            condition_level=ConditionLevel.METRIC)
        Condition.objects.create(
            raster_name="foo_raster",
            condition_dataset=foo_base_condition, is_raw=False)

        bar_base_condition = BaseCondition.objects.create(
            condition_name="bar", region_name="my_region",
            condition_level=ConditionLevel.METRIC)
        Condition.objects.create(
            raster_name="bar_raster",
            condition_dataset=bar_base_condition, is_raw=False)

    def test_retrieves_conditions(self):
        conditions = get_conditions("my_region", ["foo", "bar"])
        self.assertEqual(len(conditions), 2)
        self.assertEqual(conditions[0].condition_dataset.condition_name, "foo")
        self.assertEqual(conditions[0].raster_name, "foo_raster")
        self.assertEqual(conditions[1].condition_dataset.condition_name, "bar")
        self.assertEqual(conditions[1].raster_name, "bar_raster")

    def test_fails_for_missing_conditions(self):
        with self.assertRaises(Exception) as context:
            get_conditions("my_region", ["foo", "bar", "baz"])
        self.assertEqual(
            str(context.exception),
            "of 3 priorities, only 2 had conditions")

    def test_fails_for_wrong_region(self):
        with self.assertRaises(Exception) as context:
            get_conditions("wrong_region", ["foo", "bar"])
        self.assertEqual(
            str(context.exception),
            "of 2 priorities, only 0 had conditions")


class RasterConditionFetcherTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (.01, .02, .03, .04,
                         .05, .06, .07, .08,
                         .09, .10, .11, .12,
                         .13, .14, .15, .16))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)
        bar_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (np.nan, np.nan, np.nan, np.nan,
                         .2, .2, .2, .2,
                         .3, .3, .3, .3,
                         .4, .4, .4, .4))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "bar", "bar_normalized", bar_raster)

    def test_fetches_raster_conditions(self):
        condition_fetcher = RasterConditionFetcher(
            self.region, ["foo", "bar"],
            RasterConditionRetrievalTestCase._create_geo(self, 0, 3, 0, 1))

        assert_dict_almost_equal(
            self, condition_fetcher.conditions_to_raster_values["foo"],
            {'upper_left_coord_x': -2116971.0,
             'upper_left_coord_y': 2100954.0,
             'pixel_dist_x': [0, 1, 2, 3,
                              0, 1, 2, 3],
             'pixel_dist_y': [0, 0, 0, 0,
                              1, 1, 1, 1],
             'values': [0.01, 0.02, 0.03, 0.04,
                        0.05, 0.06, 0.07, 0.08]})
        assert_dict_almost_equal(
            self, condition_fetcher.conditions_to_raster_values["bar"],
            {'upper_left_coord_x': -2116971.0,
             'upper_left_coord_y': 2100954.0,
             'pixel_dist_x': [0, 1, 2, 3],
             'pixel_dist_y': [1, 1, 1, 1],
             'values': [0.2, 0.2, 0.2, 0.2]})

        self.assertEqual(condition_fetcher.topleft_coords[0], -2116971.0)
        self.assertEqual(condition_fetcher.topleft_coords[1], 2100954.0)
        self.assertEqual(condition_fetcher.width, 4)
        self.assertEqual(condition_fetcher.height, 2)

        assert_dict_almost_equal(
            self, condition_fetcher.data,
            {'x': [0, 1, 2, 3, 0, 1, 2, 3],
                'y': [0, 0, 0, 0, 1, 1, 1, 1],
                'foo': [0.01, 0.02, 0.03, 0.04,
                        0.05, 0.06, 0.07, 0.08],
                'bar': [np.nan, np.nan, np.nan, np.nan,
                        0.2, 0.2, 0.2, 0.2]})

        assert_dict_almost_equal(
            self, condition_fetcher.x_to_y_to_index,
            {0: {0: 0, 1: 4},
                1: {0: 1, 1: 5},
                2: {0: 2, 1: 6},
                3: {0: 3, 1: 7}})
