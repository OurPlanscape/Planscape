""" Tests for the colormap_config.py file. """

import os
import unittest

from config.colormap_config import ColormapConfig

TESTDATA_FILENAME = os.path.join(os.path.dirname(__file__), "colormap.json")


class ColormapConfigTest(unittest.TestCase):
    def setUp(self):
        self._config = ColormapConfig(TESTDATA_FILENAME)

    def test_wistia(self):
        expected = (
            "100% 252 127 0\n"
            "75% 255 160 0\n"
            "50% 255 189 0\n"
            "25% 255 232 26\n"
            "0% 228 255 122\n"
            "nv 0 0 0 0"
        )
        self.assertEqual(self._config.get_colormap_string("wistia"), expected)

    def test_inferno(self):
        expected = (
            "100% 0 0 4\n"
            "75% 87 16 110\n"
            "50% 188 55 84\n"
            "25% 249 142 9\n"
            "0% 252 255 164\n"
            "nv 0 0 0 0"
        )
        self.assertEqual(self._config.get_colormap_string("inferno"), expected)

    def test_viridis(self):
        expected = (
            "100% 68 1 84\n"
            "75% 59 82 139\n"
            "50% 33 145 140\n"
            "25% 94 201 98\n"
            "0% 253 231 37\n"
            "nv 0 0 0 0"
        )
        self.assertEqual(self._config.get_colormap_string("viridis"), expected)

    def test_default(self):
        expected = (
            "100% 68 1 84\n"
            "75% 59 82 139\n"
            "50% 33 145 140\n"
            "25% 94 201 98\n"
            "0% 253 231 37\n"
            "nv 0 0 0 0"
        )
        self.assertEqual(self._config.get_colormap_string("unknown"), expected)

    def test_st_colormap_colors(self):
        self.assertEqual(self._config.get_colormap_string("fire"), "fire")
        self.assertEqual(self._config.get_colormap_string("bluered"), "bluered")
        self.assertEqual(self._config.get_colormap_string("greyscale"), "greyscale")
