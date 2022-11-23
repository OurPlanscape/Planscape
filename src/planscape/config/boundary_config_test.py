""" Tests for the boundary_types.py file. """

import os
from typing import Optional
import unittest

from base.boundary_types import Boundary
from config.boundary_config import BoundaryConfig

TESTDATA_FILENAME = os.path.join(os.path.dirname(__file__), 'boundary.json')


class BoundaryTypesTest(unittest.TestCase):
    def setUp(self):
        self._config = BoundaryConfig(TESTDATA_FILENAME)
    
    def test_file_was_parsed(self):
        self.assertIsNotNone(self._config)

    def test_check_config(self):
        self.assertTrue(self._config.check_config())

    def test_get_boundary(self):
        boundary: Optional[Boundary] = self._config.get_boundary("huc12")
        self.assertIsNotNone(boundary)
        boundary = self._config.get_boundary("foo")
        self.assertIsNone(boundary)
