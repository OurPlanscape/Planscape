from base.region_name import (RegionName, display_name_to_region,
                              region_to_display_name)
from django.test import TestCase


class RegionNameTest(TestCase):
    def test_region_to_display_name(self):
        self.assertEqual(region_to_display_name(RegionName.TCSI), 'TCSI')
        self.assertEqual(region_to_display_name(
            RegionName.SIERRA_CASCADE_INYO), 'Sierra Nevada')
        self.assertEqual(region_to_display_name(
            RegionName.SOUTHERN_CALIFORNIA), 'Southern California')
        self.assertEqual(region_to_display_name(
            RegionName.NORTH_COAST_INLAND), 'Northern California')
        self.assertEqual(region_to_display_name(
            RegionName.COASTAL_INLAND), 'Central Coast')

    def test_display_name_to_region(self):
        self.assertEqual(display_name_to_region('TCSI'), RegionName.TCSI)
        self.assertEqual(display_name_to_region('Sierra Nevada'),
                         RegionName.SIERRA_CASCADE_INYO)
        self.assertEqual(display_name_to_region('Southern California'),
                         RegionName.SOUTHERN_CALIFORNIA)
        self.assertEqual(display_name_to_region('Northern California'),
                         RegionName.NORTH_COAST_INLAND)
        self.assertEqual(display_name_to_region('Central Coast'),
                         RegionName.COASTAL_INLAND)
        self.assertEqual(display_name_to_region('Unknown'), None)
