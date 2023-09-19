from plan.geos_utils import get_multipolygon
from django.test import TestCase
from django.contrib.gis.geos import MultiPolygon, Point, Polygon


class GetMultiPolygonTest(TestCase):
    def test_multipolygon(self):
        geo = MultiPolygon(
            (
                Polygon(
                    (
                        (-120.14015536869722, 39.05413814388948),
                        (-119.93422142411087, 39.48622140686506),
                        (-119.93422142411087, 39.05413814388948),
                        (-120.14015536869722, 39.05413814388948),
                    )
                ),
                Polygon(
                    (
                        (-120.14015536869722, 39.05413814388948),
                        (-120.18409937110482, 39.48622140686506),
                        (-119.93422142411087, 39.05413814388948),
                        (-120.14015536869722, 39.05413814388948),
                    )
                ),
            )
        )
        geo.srid = 4269
        multi = get_multipolygon(geo)
        self.assertEqual(multi.geom_type, "MultiPolygon")
        self.assertEqual(multi.coords, geo.coords)
        self.assertEqual(multi.srid, geo.srid)

    def test_polygon(self):
        geo = Polygon(
            (
                (-120.14015536869722, 39.05413814388948),
                (-120.18409937110482, 39.48622140686506),
                (-119.93422142411087, 39.48622140686506),
                (-119.93422142411087, 39.05413814388948),
                (-120.14015536869722, 39.05413814388948),
            )
        )
        geo.srid = 4269
        multi = get_multipolygon(geo)
        self.assertEqual(multi.geom_type, "MultiPolygon")
        self.assertEqual(multi.coords[0], geo.coords)
        self.assertEqual(multi.srid, geo.srid)

    def test_point(self):
        geo = Point((-120.14015536869722, 39.05413814388948))
        geo.srid = 4269
        with self.assertRaises(Exception) as context:
            get_multipolygon(geo)
        self.assertEqual(
            str(context.exception),
            "geometry, POINT (-120.14015536869722 39.05413814388948), is neither a polygon nor a multipolygon",
        )
