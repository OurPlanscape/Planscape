from attributes.models import AttributeRaster
from attributes.raster_utils import get_attribute_values_from_raster
from conditions.raster_condition_retrieval_testcase import \
    RasterRetrievalTestCase
from django.contrib.gis.geos import MultiPolygon, Polygon


class AttributePixelsTest(RasterRetrievalTestCase):
    def setUp(self) -> None:
        RasterRetrievalTestCase.setUp(self)

        foo_raster = RasterRetrievalTestCase._create_raster(
            self, 4, 4, (1, 2, 3, 4,
                         5, 6, 7, 8,
                         9, 10, 11, 12,
                         13, 14, 15, 16))
        AttributeRaster.objects.create(raster=foo_raster, name="foo")

    def test_returns_pixels(self):
        geo = RasterRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        values = get_attribute_values_from_raster(geo, "foo")
        self.assertAlmostEqual(values['upper_left_coord_x'], -2116971)
        self.assertAlmostEqual(values['upper_left_coord_y'], 2100954)
        self.assertListEqual(values['pixel_dist_x'], [0, 1, 2, 3, 0, 1, 2, 3])
        self.assertListEqual(values['pixel_dist_y'], [0, 0, 0, 0, 1, 1, 1, 1])
        self.assertListEqual(values['values'], [1, 2, 3, 4, 5, 6, 7, 8])

    def test_returns_pixels_for_intersection(self):
        # The geo spans beyond raster values.
        geo = RasterRetrievalTestCase._create_geo(self, 0, 10, -2, 1)
        values = get_attribute_values_from_raster(geo, "foo")
        self.assertAlmostEqual(values['upper_left_coord_x'], -2116971)
        self.assertAlmostEqual(values['upper_left_coord_y'], 2100954)
        self.assertListEqual(values['pixel_dist_x'], [0, 1, 2, 3, 0, 1, 2, 3])
        self.assertListEqual(values['pixel_dist_y'], [0, 0, 0, 0, 1, 1, 1, 1])
        self.assertListEqual(values['values'], [1, 2, 3, 4, 5, 6, 7, 8])

    def test_fails_for_missing_geo(self):
        with self.assertRaises(Exception) as context:
            get_attribute_values_from_raster(None, "foo")
        self.assertEqual(
            str(context.exception), "missing input geometry")

    def test_fails_for_invalid_geo(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 39),
             (-120, 42),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_attribute_values_from_raster(geo, "foo")
        self.assertIn(
            "invalid geo: Self-intersection[", str(context.exception))

    def test_fails_for_wrong_srid(self):
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 40),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_attribute_values_from_raster(geo, "foo")
        self.assertEqual(
            str(context.exception), "geometry SRID is 4269 (expected 3857)")

    def test_returns_pixel_values_for_no_intersection(self):
        geo = RasterRetrievalTestCase._create_geo(self, 7, 10, 0, 1)
        values = get_attribute_values_from_raster(geo, "foo")
        self.assertIsNone(values)

    def test_fails_for_missing_raster(self):
        geo = RasterRetrievalTestCase._create_geo(self, 0, 3, 0, 1)
        with self.assertRaises(Exception) as context:
            get_attribute_values_from_raster(geo, "nonexistent_raster_name")
        self.assertEqual(
            str(context.exception),
            "no rasters available for raster_name, nonexistent_raster_name")
