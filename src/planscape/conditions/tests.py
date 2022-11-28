import os
from decouple import config
from typing import cast

from django.db import connection
from django.test import TestCase

from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition
from conditions.views import wms
from planscape.settings import CRS_9822_PROJ4

from django.contrib.gis.gdal.raster.source import GDALRaster

PLANSCAPE_ROOT_DIRECTORY = cast(str, config('PLANSCAPE_ROOT_DIRECTORY'))
RASTER_TEST_FILE='src/planscape/testing/testdata/random_test.sql'


class ConditionTest(TestCase):
    @classmethod
    def setUpClass(cls):
        # Read the test data; this is a GeoTIFF with CRS 9822, ready to load into the
        # ConditionRaster table.  See testing/create_random_geotiff.py for details.
        geotiff_path = os.path.join(PLANSCAPE_ROOT_DIRECTORY, RASTER_TEST_FILE)
        with open(geotiff_path) as f:
            geotiff = f.read()

        # Add a row for CRS 9822 to the spatial_ref_sys table, and the GeoTiff to the table.
        with connection.cursor() as cursor:
            query = ("insert into spatial_ref_sys(srid, proj4text) values(9822, '{}')").format(
                CRS_9822_PROJ4)
            cursor.execute(query)
            cursor.execute(geotiff)

        # Add metadata rows for the raster in BaseCondition and Condition.
        base_condition = BaseCondition.objects.create(
            condition_name='element', condition_level=ConditionLevel.ELEMENT)
        condition = Condition.objects.create(
            condition_dataset=base_condition, raster_name='random_test.tif')
        super(ConditionTest, cls).setUpClass()

    def test_bad_height(self):
        response = self.client.get('/conditions/wms/?height=foo&width=87')
        self.assertEqual(response.status_code, 400)

    def test_bad_bbox(self):
        response = self.client.get(
            '/conditions/wms/?height=76&width=87&bbox=1.1,2.2,3.3,4.hg')
        self.assertEqual(response.status_code, 400)

    def test_bad_srs_prefix(self):
        response = self.client.get(
            '/conditions/wms/?height=76&width=87&bbox=1.1,2.2,3.3,4.4&srs=EPS:123')
        self.assertEqual(response.status_code, 400)

    def test_bad_srs_int(self):
        response = self.client.get(
            '/conditions/wms/?height=76&width=87&bbox=1.1,2.2,3.3,4.4&srs=EPSG:bar')
        self.assertEqual(response.status_code, 400)

    def test_bad_layers(self):
        response = self.client.get(
            '/conditions/wms/?height=100&width=100&srs=EPSG:4326&bbox=-115.7,44.4,-115.6,44.5'
            '&format=image/jpeg&layers=foo.tif')
        self.assertEqual(response.status_code, 400)

    def test_good_request(self):
        response = self.client.get(
            '/conditions/wms/?height=100&width=100&srs=EPSG:4326&bbox=-115.7,44.4,-115.6,44.5'
            '&format=image/jpeg&layers=random_test.tif')
        self.assertEqual(response.status_code, 200)
