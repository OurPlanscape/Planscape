from django.test import TestCase

from datasets.styles import get_default_raster_style


class TestGetDefaultRasterStyle(TestCase):
    def test_normal_range(self):
        result = get_default_raster_style(0, 70)
        self.assertEqual(len(result["entries"]), 7)
        self.assertEqual(result["entries"][0]["value"], 0)  # First breakpoint
        self.assertEqual(result["entries"][-1]["value"], 70)  # Last breakpoint

    def test_simple(self):
        result = get_default_raster_style(2.40, 3.79)
        self.assertEqual(len(result["entries"]), 7)
        self.assertEqual(result["entries"][0]["value"], 2.40)
        self.assertEqual(result["entries"][-1]["value"], 3.79)

    def test_min_equals_max(self):
        result = get_default_raster_style(50, 50)
        self.assertEqual(len(result["entries"]), 1)
        self.assertEqual(result["entries"][0]["value"], 50)

    def test_floating_point_values(self):
        result = get_default_raster_style(1.5, 8.5)
        self.assertEqual(len(result["entries"]), 7)
        self.assertAlmostEqual(result["entries"][0]["value"], 1.5, places=1)

    def test_negative_values(self):
        result = get_default_raster_style(-10, 10)
        self.assertEqual(len(result["entries"]), 7)
        self.assertAlmostEquals(result["entries"][0]["value"], -10, 2)
        self.assertEqual(result["entries"][-1]["value"], 10)

    def test_large_numbers(self):
        result = get_default_raster_style(1000, 5000)
        self.assertEqual(len(result["entries"]), 7)
        self.assertAlmostEquals(result["entries"][0]["value"], 1000, 2)
        self.assertAlmostEquals(result["entries"][-1]["value"], 5000, 2)
