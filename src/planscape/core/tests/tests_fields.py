from django.contrib.gis.geos import (
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
)
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from core.fields import GeometryTypeField


def simple_polygon():
    return Polygon(
        (
            (0, 0),
            (0, 1),
            (1, 1),
            (1, 0),
            (0, 0),
        )
    )


class GeometryTypeFieldTests(SimpleTestCase):
    def test_accepts_allowed_type(self):
        field = GeometryTypeField(geometry_type="MULTIPOLYGON")
        geometry = MultiPolygon(simple_polygon())
        result = field.run_validation(geometry)
        self.assertIsInstance(result, MultiPolygon)

    def test_rejects_disallowed_type(self):
        field = GeometryTypeField(geometry_type="POLYGON")
        geometry = MultiPoint(Point(0, 0))
        with self.assertRaises(ValidationError):
            field.run_validation(geometry)

    def test_coerce_multi_promotes_polygon(self):
        field = GeometryTypeField(geometry_type="MULTIPOLYGON", coerce_multi=True)
        geometry = simple_polygon()
        result = field.run_validation(geometry)
        self.assertIsInstance(result, MultiPolygon)

    def test_coerce_multi_promotes_linestring(self):
        field = GeometryTypeField(geometry_type="MULTILINESTRING", coerce_multi=True)
        geometry = LineString(
            (0, 0),
            (1, 1),
        )
        result = field.run_validation(geometry)
        self.assertIsInstance(result, MultiLineString)

    def test_coerce_multi_promotes_point(self):
        field = GeometryTypeField(geometry_type="MULTIPOINT", coerce_multi=True)
        geometry = Point(0, 0)
        result = field.run_validation(geometry)
        self.assertIsInstance(result, MultiPoint)

    def test_without_coerce_multi_raises_for_single_geometry(self):
        field = GeometryTypeField(geometry_type="MULTIPOLYGON", coerce_multi=False)
        geometry = simple_polygon()
        with self.assertRaises(ValidationError):
            field.run_validation(geometry)

    def test_destination_srid_transforms_geometry(self):
        field = GeometryTypeField(
            geometry_type="MULTIPOLYGON",
            coerce_multi=True,
            destination_srid=3857,
        )
        geometry = simple_polygon()
        geometry.srid = 4326
        result = field.run_validation(geometry)
        self.assertEqual(result.srid, 3857)
