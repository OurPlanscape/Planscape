import numpy as np

from django.test import TestCase
from forsys.forsys_request_params import StandEligibilityParams
from forsys.raster_condition_treatment_eligibility_selector import (
    RasterConditionTreatmentEligibilitySelector,
)


class RasterConditionTreatmentEligibilitySelectorTest(TestCase):
    def setUp(self):
        self.data = {
            "x": [0, 1, 0, 1],
            "y": [0, 0, 1, 1],
            "foo": [0.1, 0.2, 0.5, np.nan],
            "bar": [0.5, 0.1, np.nan, 0.2],
        }

        self.stand_eligibility_params = StandEligibilityParams()
        self.buildings_key = "buildings"
        self.road_proximity_key = "road_proximity"
        self.slope_key = "slope"

    def test_selects_condition_pixels(self):
        selector = RasterConditionTreatmentEligibilitySelector(
            self.data,
            ["foo", "bar"],
            self.stand_eligibility_params,
            self.buildings_key,
            self.road_proximity_key,
            self.slope_key,
        )
        self.assertEqual(selector.pixels_to_treat, {0: {0: 0}, 1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through, {0: {1: 2}, 1: {1: 3}})

    def test_fails_for_missing_condition(self):
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar", "baz"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(str(context.exception), "data missing input priority, baz")

    def test_fails_for_missing_x_for_condition(self):
        data = self.data
        data.pop("x")
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(str(context.exception), "data missing key, x")

    def test_fails_for_missing_y_for_condition(self):
        data = self.data
        data.pop("y")
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(str(context.exception), "data missing key, y")

    def test_fails_for_different_x_and_y_column_lengths_for_condition(self):
        data = self.data
        data["x"].append(10)
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception), "data column lengths are unequal for keys, x and y"
        )

    def test_fails_for_different_x_and_priority_column_lengths(self):
        data = self.data
        data["x"].append(0)
        data["x"].append(1)
        data["y"].append(2)
        data["y"].append(2)
        data["bar"].append(0.1)
        data["bar"].append(0.1)
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception),
            "data column lengths are unequal for keys, x and foo",
        )

    def test_responds_to_buildings(self):
        data = self.data
        data["buildings"] = [1, 0, 0, 0]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_buildings = True
        selector = RasterConditionTreatmentEligibilitySelector(
            self.data,
            ["foo", "bar"],
            self.stand_eligibility_params,
            self.buildings_key,
            self.road_proximity_key,
            self.slope_key,
        )
        self.assertEqual(selector.pixels_to_treat, {1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through, {0: {0: 0, 1: 2}, 1: {1: 3}})

    def test_raises_error_for_missing_buildings(self):
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_buildings = True
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception), "data missing input attribute, buildings"
        )

    def test_raises_error_for_wrong_buildings_column_length(self):
        data = self.data
        data["buildings"] = [1, 0, 0, 0, 1]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_buildings = True
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                self.stand_eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception),
            "data column lengths are unequal for keys, x and buildings",
        )

    def test_responds_to_road_proximity_zero(self):
        data = self.data
        data["road_proximity"] = [0.0, 300.0, 500.0, 600.0]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_road_proximity = True
        eligibility_params.max_distance_from_road_in_meters = 800.0
        selector = RasterConditionTreatmentEligibilitySelector(
            data,
            ["foo", "bar"],
            eligibility_params,
            self.buildings_key,
            self.road_proximity_key,
            self.slope_key,
        )
        self.assertEqual(selector.pixels_to_treat, {1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through, {0: {0: 0, 1: 2}, 1: {1: 3}})

    def test_responds_to_road_proximity_threshold(self):
        data = self.data
        data["road_proximity"] = [200.0, 300.0, 500.0, 1000.0]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_road_proximity = True
        eligibility_params.max_distance_from_road_in_meters = 800.0
        selector = RasterConditionTreatmentEligibilitySelector(
            data,
            ["foo", "bar"],
            eligibility_params,
            self.buildings_key,
            self.road_proximity_key,
            self.slope_key,
        )
        self.assertEqual(selector.pixels_to_treat, {0: {0: 0}, 1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through, {0: {1: 2}})

    def test_raises_error_for_missing_road_proximity(self):
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_road_proximity = True
        eligibility_params.max_distance_from_road_in_meters = 800
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception), "data missing input attribute, road_proximity"
        )

    def test_raises_error_for_wrong_road_proximity_column_length(self):
        data = self.data
        data["road_proximity"] = [200, 300, 500]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_road_proximity = True
        eligibility_params.max_distance_from_road_in_meters = 800
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                data,
                ["foo", "bar"],
                eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception),
            "data column lengths are unequal for keys, x and road_proximity",
        )

    def test_responds_to_slope_threshold(self):
        data = self.data
        data["slope"] = [1000.0, 300.0, 500.0, 600.0]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_slope = True
        eligibility_params.max_slope_in_percent_rise = 800.0
        selector = RasterConditionTreatmentEligibilitySelector(
            data,
            ["foo", "bar"],
            eligibility_params,
            self.buildings_key,
            self.road_proximity_key,
            self.slope_key,
        )
        self.assertEqual(selector.pixels_to_treat, {1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through, {0: {0: 0, 1: 2}, 1: {1: 3}})

    def test_raises_error_for_missing_slope(self):
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_slope = True
        eligibility_params.max_slope_in_percent_rise = 800
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,
                ["foo", "bar"],
                eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(str(context.exception), "data missing input attribute, slope")

    def test_raises_error_for_wrong_slope_column_length(self):
        data = self.data
        data["slope"] = [200, 300, 500]
        eligibility_params = self.stand_eligibility_params
        eligibility_params.filter_by_slope = True
        eligibility_params.max_slope_in_percent_rise = 800
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                data,
                ["foo", "bar"],
                eligibility_params,
                self.buildings_key,
                self.road_proximity_key,
                self.slope_key,
            )
        self.assertEqual(
            str(context.exception),
            "data column lengths are unequal for keys, x and slope",
        )
