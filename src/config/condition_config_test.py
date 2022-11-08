""" Tests for the pillar_config.py file. """

import os
from typing import Optional
import unittest

from base.condition_types import Region, Pillar, Element, Metric
from config.conditions_config import PillarConfig

TESTDATA_FILENAME = os.path.join(os.path.dirname(__file__), 'metrics.json')


class PillarConfigTest(unittest.TestCase):
    def setUp(self):
        self._config = PillarConfig(TESTDATA_FILENAME)

    def test_file_was_parsed(self):
        self.assertIsNotNone(self._config)

    def test_check_config(self):
        self.assertTrue(self._config.check_config())

    def test_get_region(self):
        region: Optional[Region] = self._config.get_region("tcsi")
        self.assertIsNotNone(region)
        region = self._config.get_region("foo")
        self.assertIsNone(region)

    def test_get_pillar(self):
        pillar: Optional[Pillar] = self._config.get_pillar(
            "tcsi", "fire_dynamics")
        self.assertIsNotNone(pillar)
        pillar = self._config.get_pillar("foo", "bar")
        self.assertIsNone(pillar)

    def test_get_element(self):
        element: Optional[Element] = self._config.get_element(
            "tcsi", "fire_dynamics", "fire_severity")
        self.assertIsNotNone(element)
        element = self._config.get_element("foo", "bar", "baz")
        self.assertIsNone(element)

    def test_get_metric(self):
        metric: Optional[Metric] = self._config.get_metric(
            "tcsi", "fire_dynamics", "fire_severity", "high_severity_patch_size")
        self.assertIsNotNone(metric)
        metric = self._config.get_metric("foo", "bar", "baz", "boo")
        self.assertIsNone(metric)


if __name__ == '__main__':
    unittest.main()
