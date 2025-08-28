# tests/test_bounding_utils.py

from django.contrib.gis.geos import LineString, Point, Polygon
from django.test import SimpleTestCase

# Adjust import to your module path
from gis.geometry import get_bounding_box, get_bounding_polygon


class GetBoundingBoxTests(SimpleTestCase):
    def test_extent_of_polygon_collection(self):
        """
        Two disjoint polygons should produce a bbox spanning both.
        """
        p1 = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)), srid=4326)
        p2 = Polygon(((2, 2), (2, 3), (3, 3), (3, 2), (2, 2)), srid=4326)

        extent = get_bounding_box([p1, p2])
        self.assertEqual(extent, (0.0, 0.0, 3.0, 3.0))

    def test_extent_with_mixed_geometry_types(self):
        """
        Accepts any GEOSGeometry objects; verify Point/LineString expand bbox.
        """
        poly = Polygon(((0, 0), (0, 2), (2, 2), (2, 0), (0, 0)), srid=4326)
        pt = Point(5, -1, srid=4326)  # expands xmax and ymin
        ln = LineString((1, 3), (4, 3), srid=4326)  # expands ymax/xmax

        extent = get_bounding_box([poly, pt, ln])
        self.assertEqual(extent, (0.0, -1.0, 5.0, 3.0))

    def test_empty_list_returns_none(self):
        self.assertIsNone(get_bounding_box([]))

    def test_none_argument_returns_none(self):
        # done on purpose
        self.assertIsNone(get_bounding_box(None))  # type: ignore


class GetBoundingPolygonTests(SimpleTestCase):
    def test_bounding_polygon_geometry_and_coords(self):
        """
        Build the bbox polygon and compare with the expected rectangle.
        """
        base = Polygon(((0, 0), (0, 2), (2, 2), (2, 0), (0, 0)), srid=4326)
        pt = Point(5, -1, srid=4326)
        ln = LineString((1, 3), (4, 3), srid=4326)

        bbox_poly = get_bounding_polygon([base, pt, ln])

        expected = Polygon(
            ((0.0, -1.0), (0.0, 3.0), (5.0, 3.0), (5.0, -1.0), (0.0, -1.0)),
            srid=4326,
        )

        # Exact coordinate equality
        self.assertTrue(bbox_poly.equals_exact(expected, tolerance=0.0))

        # Ring is closed
        shell = bbox_poly.shell
        self.assertEqual(shell.coords[0], shell.coords[-1])

    def test_srid_is_propagated_from_first_geometry(self):
        """
        SRID comes from geometries[0].srid.
        """
        p1 = Polygon(((10, 10), (10, 11), (11, 11), (11, 10), (10, 10)), srid=3857)
        p2 = Polygon(((12, 12), (12, 13), (13, 13), (13, 12), (12, 12)), srid=4326)

        bbox_poly = get_bounding_polygon([p1, p2])
        self.assertEqual(bbox_poly.srid, 3857)

    def test_touching_polygons(self):
        """
        Touching polygons should not expand bbox beyond shared edge.
        """
        left = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)), srid=4326)
        right = Polygon(
            ((1, 0), (1, 1), (2, 1), (2, 0), (1, 0)), srid=4326
        )  # shares x=1

        bbox_poly = get_bounding_polygon([left, right])
        expected = Polygon(((0, 0), (0, 1), (2, 1), (2, 0), (0, 0)), srid=4326)

        self.assertTrue(bbox_poly.equals_exact(expected, tolerance=0.0))

    def test_empty_input_returns_empty_polygon(self):
        """
        New behavior: returns an empty Polygon() when there is no extent.
        """
        bbox_poly = get_bounding_polygon([])

        self.assertTrue(bbox_poly.empty)
        # Empty polygon has no SRID by default unless set explicitly
        self.assertIsNone(bbox_poly.srid)
