import numpy as np

from django.test import TestCase
from forsys.raster_condition_treatment_eligibility_selector import RasterConditionTreatmentEligibilitySelector


class RasterConditionTreatmentEligibilitySelectorTest(TestCase):
    def setUp(self):
        self.data = {'x': [0, 1, 0, 1],
                     'y': [0, 0, 1, 1],
                     'foo': [0.1, 0.2, 0.5, np.nan],
                     'bar': [0.5, 0.1, np.nan, 0.2]
                     }

    def test_selects_pixels(self):
        selector = RasterConditionTreatmentEligibilitySelector(
            self.data,  ['foo', 'bar'])
        self.assertEqual(selector.pixels_to_treat, {0: {0: 0}, 1: {0: 1}})
        self.assertEqual(selector.pixels_to_pass_through,
                         {0: {1: 2}, 1: {1: 3}})

    def test_fails_for_extraneous_priorities(self):
        with self.assertRaises(Exception) as context:
            RasterConditionTreatmentEligibilitySelector(
                self.data,  ['foo', 'bar', 'baz'])
        self.assertEqual(
            str(context.exception),
            "data missing input priority, baz")
