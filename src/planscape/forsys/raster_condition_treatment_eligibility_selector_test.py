import numpy as np

from django.test import TestCase
from forsys.forsys_request_params import StandEligibilityParams
from forsys.raster_condition_treatment_eligibility_selector import RasterConditionTreatmentEligibilitySelector


class RasterConditionTreatmentEligibilitySelectorTest(TestCase):
    def setUp(self):
        self.data = {'x': [0, 1, 0, 1],
                     'y': [0, 0, 1, 1],
                     'foo': [0.1, 0.2, 0.5, np.nan],
                     'bar': [0.5, 0.1, np.nan, 0.2]
                     }
        
        self.stand_eligibility_params = StandEligibilityParams()

    def test_selects_pixels(self):
        selector = RasterConditionTreatmentEligibilitySelector(
            self.data,  ['foo', 'bar'], self.stand_eligibility_params)
        self.assertEqual(selector.pixels_to_treat, {0: {0: 0}, 1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through,
                         {0: {1: 2}, 1: {1: 3}})

    def test_fails_for_missing_priorities(self):
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,  ['foo', 'bar', 'baz'], self.stand_eligibility_params)
        self.assertEqual(
            str(context.exception),
            "data missing input priority, baz")

    def test_fails_for_missing_x(self):
        data = self.data
        data.pop('x')
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,  ['foo', 'bar'], self.stand_eligibility_params)
        self.assertEqual(
            str(context.exception),
            "data missing key, x")
        
    def test_fails_for_missing_y(self):
        data = self.data
        data.pop('y')
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,  ['foo', 'bar'], self.stand_eligibility_params)
        self.assertEqual(
            str(context.exception),
            "data missing key, y")
        
    def test_fails_for_different_x_and_y_column_lengths(self):
        data = self.data
        data['x'].append(10)
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,  ['foo', 'bar'], self.stand_eligibility_params)
        self.assertEqual(
            str(context.exception),
            "data column lengths are unequal for keys, x and y")
        
    def test_fails_for_different_x_and_priority_column_lengths(self):
        data = self.data
        data['x'].append(0)
        data['x'].append(1)
        data['y'].append(2)
        data['y'].append(2)
        data['bar'].append(0.1)
        data['bar'].append(0.1)
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,  ['foo', 'bar'], self.stand_eligibility_params)
        self.assertEqual(
            str(context.exception),
            "data column lengths are unequal for keys, x and foo")
