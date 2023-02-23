import numpy as np

from forsys.merge_polygons import merge_polygons
from django.test import TestCase
from django.contrib.gis.geos import Polygon
from planscape import settings


class MergePolygonsTest(TestCase):
    def setUp(self):
        self.xorig = -2116971
        self.yorig = 2100954

        self.side = 300
        self.xscale = self.side
        self.yscale = -self.side

        self.srid = settings.CRS_FOR_RASTERS

        self.margin = np.sqrt(2) * self.side / 2

    def test_merges_contiguous_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 is contiguous with p1.
        p2 = self._create_polygon(((5, 0), (5, 3), (8, 3), (8, 0), (5, 0)))
        poly = merge_polygons([p1, p2], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0]),
                         ((5, 5), (0, 5), (0, 0), (8, 0),
                          (8, 3), (5, 3), (5, 5)))

    def test_merges_overlapping_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 overlaps with p1.
        p2 = self._create_polygon(((4, 0), (4, 3), (8, 3), (8, 0), (4, 0)))
        poly = merge_polygons([p1, p2], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0]),
                         ((5, 5), (0, 5), (0, 0), (8, 0),
                          (8, 3), (5, 3), (5, 5)))

    def test_merges_three_nonoverlapping_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 is not contiguous or overlapping with p1.
        p2 = self._create_polygon(((6, 0), (6, 3), (8, 3), (8, 0), (6, 0)))
        # p3 is contiguous with p1 and not contiguous or overlapping with p2.
        p3 = self._create_polygon(((0, 0), (0, 1), (-1, 1), (-1, 0), (0, 0)))
        poly = merge_polygons([p1, p2, p3], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "MultiPolygon")
        self.assertEqual(len(poly.coords), 2)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0][0]),
                         ((5, 0), (5, 5), (0, 5), (0, 1), (-1, 0), (5, 0)))
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[1][0]),
                         ((8, 0), (8, 3), (6, 3), (6, 0), (8, 0)))

    def test_merges_three_overlapping_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 is not contiguous or overlapping with p1.
        p2 = self._create_polygon(((6, 0), (6, 3), (8, 3), (8, 0), (6, 0)))
        # p3 is contiguous with p1 and p2.
        p3 = self._create_polygon(((5, 0), (5, 5), (6, 5), (6, 0), (5, 0)))
        poly = merge_polygons([p1, p2, p3], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0]),
                         ((0, 5), (0, 0), (8, 0), (8, 3),
                          (6, 3), (6, 5), (0, 5)))

    def test_merges_overlapping_polygons_torus(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (1, 5), (1, 0), (0, 0)))
        p2 = self._create_polygon(((0, 0), (0, 1), (5, 1), (5, 0), (0, 0)))
        p3 = self._create_polygon(((4, 0), (4, 5), (5, 5), (5, 0), (4, 0)))
        p4 = self._create_polygon(((0, 4), (0, 5), (5, 5), (5, 4), (0, 4)))
        poly = merge_polygons([p1, p2, p3, p4], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(poly.num_interior_rings, 1)
        self.assertEqual(len(poly.coords), 2)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0]),
                         ((4, 0), (5, 0), (5, 5), (0, 5), (0, 0), (4, 0)))
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[1]),
                         ((4, 1), (1, 1), (1, 4), (4, 4), (4, 1)))

    def test_merges_polygons_along_diagonal(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        p2 = self._create_polygon(((0, 0), (0, -5), (-5, -5), (-5, 0), (0, 0)))
        poly = merge_polygons([p1, p2], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "MultiPolygon")
        self.assertEqual(len(poly.coords), 2)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0][0]),
                         ((5, 0), (5, 5), (0, 5), (0, 0), (5, 0)))
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[1][0]),
                         ((-5, 0), (-5, -5), (0, -5), (0, 0), (-5, 0)))

    def test_merges_unit_polygons_along_diagonal(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        p2 = self._create_polygon(((0, 0), (0, -1), (-1, -1), (-1, 0), (0, 0)))
        poly = merge_polygons([p1, p2], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "MultiPolygon")
        self.assertEqual(len(poly.coords), 2)
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0][0]),
                         ((1, 0), (1, 1), (0, 1), (0, 0), (1, 0)))
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[1][0]),
                         ((-1, 0), (-1, -1), (0, -1), (0, 0), (-1, 0)))

    def test_merges_contiguous_unit_polygons_along_diagonal(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        p2 = self._create_polygon(((0, 0), (0, -1), (-1, -1), (-1, 0), (0, 0)))
        p3 = self._create_polygon(((0, 0), (0, -1), (1, -1), (1, 0), (0, 0)))
        poly = merge_polygons([p1, p2, p3], self.margin)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        # Because of the smiplify_margin value, the merged polygon doesn't have
        # points, (0, 0) and (-1, 0).
        self.assertEqual(self._coords_to_pixel_coords(poly.coords[0]),
                         ((1, 1), (0, 1), (-1, -1), (1, -1), (1, 1)))

    def test_returns_none_for_empty_polygons_list(self) -> None:
        poly = merge_polygons([], self.margin)
        self.assertIsNone(poly)

    def test_raises_error_for_polygons_with_different_srids(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        p2 = self._create_polygon(((5, 0), (5, 3), (8, 3), (8, 0), (5, 0)))
        p2.srid = 4632
        with self.assertRaises(Exception) as context:
            merge_polygons([p1, p2], self.margin)
        self.assertEqual(str(context.exception),
                         "merge_polygon input polygons have different SRID's")

    def _create_polygon(self, pixel_coords: list[tuple[int, int]]) -> Polygon:
        coords = []
        for coord in pixel_coords:
            coords.append(self._pixel_tuple_to_coord(coord))
        poly = Polygon(coords)
        poly.srid = self.srid
        return poly

    def _pixel_tuple_to_coord(self,
                              pixel: tuple[int, int]) -> tuple[float, float]:
        return (self.xorig + pixel[0] * self.xscale,
                self.yorig + pixel[1] * self.yscale)

    def _coords_to_pixel_coords(self,
                                coords: tuple[tuple[float, float]]) -> tuple[tuple[int, int]]:
        pixel_coords = []
        for coord in coords:
            pixel_coords.append(self._coord_tuple_to_pixel(coord))
        return tuple(pixel_coords)

    def _coord_tuple_to_pixel(self,
                              coord: tuple[float, float]) -> tuple[int, int]:
        return (int((coord[0] - self.xorig) / self.xscale),
                int((coord[1] - self.yorig) / self.yscale))
