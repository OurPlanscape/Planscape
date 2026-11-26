import json
import fiona
from shapely.geometry import shape
from django.test import TestCase
from django.contrib.gis.geos import (
    GEOSGeometry,
    GeometryCollection,
    LineString,
    MultiPolygon,
    Point,
    Polygon,
)
from planning.geometry import coerce_geojson, coerce_geometry, to_polygonal_or_none
from planscape.exceptions import InvalidGeometry


def read_shapefile(path):
    return fiona.open(path)


def to_geometry(fiona_geom) -> GEOSGeometry:
    shapely_geom = shape(fiona_geom)
    return GEOSGeometry(shapely_geom.wkt, srid=4326)


class GeometryTestCase(TestCase):
    def setUp(self):
        with read_shapefile("planning/tests/test_data/self-intersection.shp") as col:
            self.self_intersection = to_geometry(col[0].geometry)

    def coerce_geometry_raises_error_on_invalid_geom1(self):
        with self.assertRaises(
            InvalidGeometry, msg="Geometry is invalid and cannot be used."
        ):
            coerce_geometry(self.self_intersection)

    def coerce_geojson_raises_error_on_invalid_geom1(self):
        with self.assertRaises(
            InvalidGeometry, msg="Geometry is invalid and cannot be used."
        ):
            data = {"features": [{"geometry": json.loads(self.self_intersection.json)}]}
            coerce_geojson(data)


class ToPolygonalOrNoneTest(TestCase):
    def setUp(self):
        self.square = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)), srid=4269)
        self.other = Polygon(((2, 2), (2, 3), (3, 3), (3, 2), (2, 2)), srid=4269)

    def test_none_and_empty(self):
        self.assertIsNone(to_polygonal_or_none(None))
        self.assertIsNone(to_polygonal_or_none(Polygon(srid=4269)))

    def test_polygon_becomes_multipolygon(self):
        result = to_polygonal_or_none(self.square)
        self.assertEqual(result.geom_type, "MultiPolygon")
        self.assertEqual(result.srid, 4269)
        self.assertTrue(result.equals(self.square))

    def test_multipolygon_is_returned_as_is(self):
        multi = MultiPolygon([self.square, self.other], srid=4269)
        self.assertIs(to_polygonal_or_none(multi), multi)

    def test_lower_dimension_geometries_are_dropped(self):
        self.assertIsNone(to_polygonal_or_none(LineString((0, 0), (1, 1))))
        self.assertIsNone(to_polygonal_or_none(Point(0, 0)))

    def test_collection_keeps_only_polygonal_parts(self):
        collection = GeometryCollection(
            self.square,
            LineString((5, 5), (6, 6)),
            MultiPolygon([self.other]),
            Point(9, 9),
            srid=4269,
        )
        result = to_polygonal_or_none(collection)
        self.assertEqual(result.geom_type, "MultiPolygon")
        self.assertEqual(len(result), 2)
        self.assertEqual(result.srid, 4269)
        self.assertAlmostEqual(result.area, 2)

    def test_collection_without_polygons_is_none(self):
        collection = GeometryCollection(
            LineString((0, 0), (1, 1)), Point(0, 0), srid=4269
        )
        self.assertIsNone(to_polygonal_or_none(collection))
