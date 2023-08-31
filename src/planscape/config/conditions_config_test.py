""" Tests for the pillar_config.py file. """

import os
from typing import Optional
import unittest

from base.condition_types import Region, Pillar, Element, Metric
from config.conditions_config import PillarConfig

TESTDATA_FILENAME = os.path.join(os.path.dirname(__file__), 'conditions.json')


class PillarConfigTest(unittest.TestCase):
    def setUp(self):
        self._config = PillarConfig(TESTDATA_FILENAME)

    def test_file_was_parsed(self):
        self.assertIsNotNone(self._config)

    def test_check_config(self):
        self.assertTrue(self._config.check_config())

    def test_get_region(self):
        region: Optional[Region] = self._config.get_region(
            "sierra-nevada")
        self.assertIsNotNone(region)
        region = self._config.get_region("foo")
        self.assertIsNone(region)

    def test_get_pillar(self):
        pillar: Optional[Pillar] = self._config.get_pillar(
            "sierra-nevada", "fire_dynamics")
        self.assertIsNotNone(pillar)
        pillar = self._config.get_pillar("foo", "bar")
        self.assertIsNone(pillar)

    def test_get_element(self):
        element: Optional[Element] = self._config.get_element(
            "sierra-nevada", "fire_dynamics", "functional_fire")
        self.assertIsNotNone(element)
        element = self._config.get_element("foo", "bar", "baz")
        self.assertIsNone(element)

    def test_get_metric(self):
        metric: Optional[Metric] = self._config.get_metric(
            "sierra-nevada", "fire_dynamics", "functional_fire", "annual_burn_probability")
        self.assertIsNotNone(metric)
        metric = self._config.get_metric("foo", "bar", "baz", "boo")
        self.assertIsNone(metric)

    def test_get_min_max_values(self):
        self.assertEqual(self._config.get_min_max_values(
            'fire_dynamics.tif'), (-1, 1))
        self.assertEqual(self._config.get_min_max_values(
            'functional_fire.tif'), (-1, 1))
        self.assertEqual(self._config.get_min_max_values(
            'TPA_30in_up_2021_300m.tif'), (0, 35))
        self.assertEqual(self._config.get_min_max_values(
            'TPA_30in_up_2021_300m_normalized.tif'), (-1, 1))
    
    def test_get_data_units(self):
        self.assertEqual(self._config.get_data_units(
            'fire_dynamics.tif'), None)
        self.assertEqual(self._config.get_data_units(
            'functional_fire.tif'), None)
        self.assertEqual(self._config.get_data_units(
            'TPA_30in_up_2021_300m.tif'), "Live Trees/Acre")
        self.assertEqual(self._config.get_data_units(
            'TPA_30in_up_2021_300m_normalized.tif'), None)


if __name__ == '__main__':
    unittest.main()
