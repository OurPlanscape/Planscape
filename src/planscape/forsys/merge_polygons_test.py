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

        self.margin_for_unit_pixels = np.sqrt(2) * self.side / 2

    # -----------------------------------------------------------------------
    # The following tests are for validating merging (with simplify_margin=0)
    # -----------------------------------------------------------------------

    def test_merges_contiguous_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 is contiguous with p1.
        p2 = self._create_polygon(((5, 0), (5, 3), (8, 3), (8, 0), (5, 0)))
        poly = merge_polygons([p1, p2], 0)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[0]),
            [(0, 0), (0, 5), (5, 3), (5, 5), (8, 0), (8, 3)],
        )

    def test_merges_overlapping_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 overlaps with p1.
        p2 = self._create_polygon(((4, 0), (4, 3), (8, 3), (8, 0), (4, 0)))
        poly = merge_polygons([p1, p2], 0)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[0]),
            [(0, 0), (0, 5), (5, 3), (5, 5), (8, 0), (8, 3)],
        )

    def test_merges_three_nonoverlapping_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 is not contiguous or overlapping with p1.
        p2 = self._create_polygon(((6, 0), (6, 3), (8, 3), (8, 0), (6, 0)))
        # p3 is contiguous with p1 and not contiguous or overlapping with p2.
        p3 = self._create_polygon(((0, 0), (0, 1), (-1, 1), (-1, 0), (0, 0)))
        poly = merge_polygons([p1, p2, p3], 0)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "MultiPolygon")
        self.assertEqual(len(poly.coords), 2)
        # The first polygon is a merging of p1 and p3.
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[0][0]),
            [(-1, 0), (-1, 1), (0, 1), (0, 5), (5, 0), (5, 5)],
        )
        # The second polygon is p2.
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[1][0]),
            [(6, 0), (6, 3), (8, 0), (8, 3)],
        )

    def test_merges_three_overlapping_polygons(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        # p2 is not contiguous or overlapping with p1.
        p2 = self._create_polygon(((6, 0), (6, 3), (8, 3), (8, 0), (6, 0)))
        # p3 is contiguous with p1 and p2.
        p3 = self._create_polygon(((5, 0), (5, 5), (6, 5), (6, 0), (5, 0)))
        poly = merge_polygons([p1, p2, p3], 0)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(len(poly.coords), 1)
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[0]),
            [(0, 0), (0, 5), (6, 3), (6, 5), (8, 0), (8, 3)],
        )

    def test_merges_overlapping_polygons_torus(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (1, 5), (1, 0), (0, 0)))
        p2 = self._create_polygon(((0, 0), (0, 1), (5, 1), (5, 0), (0, 0)))
        p3 = self._create_polygon(((4, 0), (4, 5), (5, 5), (5, 0), (4, 0)))
        p4 = self._create_polygon(((0, 4), (0, 5), (5, 5), (5, 4), (0, 4)))
        poly = merge_polygons([p1, p2, p3, p4], 0)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "Polygon")
        self.assertEqual(poly.num_interior_rings, 1)
        self.assertEqual(len(poly.coords), 2)
        # There are 5 points rather than 4 because the start/end point of the
        # polygon isn't a corner.
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[0]),
            [(0, 0), (0, 5), (4, 0), (5, 0), (5, 5)],
        )
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[1]),
            [(1, 1), (1, 4), (4, 1), (4, 4)],
        )

    def test_merges_polygons_along_diagonal(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        p2 = self._create_polygon(((0, 0), (0, -5), (-5, -5), (-5, 0), (0, 0)))
        poly = merge_polygons([p1, p2], 0)
        self.assertEqual(poly.srid, self.srid)
        self.assertEqual(poly.geom_type, "MultiPolygon")
        self.assertEqual(len(poly.coords), 2)
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[0][0]),
            [(0, 0), (0, 5), (5, 0), (5, 5)],
        )
        self.assertEqual(
            self._coords_to_sorted_pixel_coords(poly.coords[1][0]),
            [(-5, -5), (-5, 0), (0, -5), (0, 0)],
        )

    # ------------------------------------------------------
    # The following tests are for validating simplify_margin
    # ------------------------------------------------------

    def test_merges_unit_polygons_along_line(self) -> None:
        polygons = []
        for i in range(5):
            polygons.append(
                self._create_polygon(((0, i), (0, i + 1), (1, i + 1), (1, i), (0, i)))
            )
        poly_no_simplification = merge_polygons(polygons, None)
        self.assertEqual(poly_no_simplification.srid, self.srid)
        self.assertEqual(poly_no_simplification.geom_type, "Polygon")
        self.assertEqual(len(poly_no_simplification.coords[0]), 13)

        poly_simplification_margin_0 = merge_polygons(polygons, 0)
        self.assertEqual(poly_simplification_margin_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_0.geom_type, "Polygon")
        # expecting 5, but if the start/end point isn't a corner, it could be 6.
        self.assertLessEqual(len(poly_simplification_margin_0.coords[0]), 6)
        self.assertGreaterEqual(len(poly_simplification_margin_0.coords[0]), 5)

        poly_simplification_margin_gt_0 = merge_polygons(
            polygons, self.margin_for_unit_pixels
        )
        self.assertEqual(poly_simplification_margin_gt_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_gt_0.geom_type, "Polygon")
        # expecting 5, but if the start/end point isn't a corner, it could be 6.
        self.assertLessEqual(len(poly_simplification_margin_gt_0.coords[0]), 6)
        self.assertGreaterEqual(len(poly_simplification_margin_gt_0.coords[0]), 5)

    def test_merges_unit_polygons_along_diagonal(self) -> None:
        # Polygons that share a common point are not considered contiguous;
        # thus, no merging occurs.
        polygons = []
        for i in range(5):
            polygons.append(
                self._create_polygon(
                    ((i, i), (i, i + 1), (i + 1, i + 1), (i + 1, i), (i, i))
                )
            )
        poly_no_simplification = merge_polygons(polygons, None)
        self.assertEqual(poly_no_simplification.srid, self.srid)
        self.assertEqual(poly_no_simplification.geom_type, "MultiPolygon")
        self.assertEqual(len(poly_no_simplification.coords), 5)

        poly_simplification_margin_0 = merge_polygons(polygons, 0)
        self.assertEqual(poly_simplification_margin_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_0.geom_type, "MultiPolygon")
        self.assertEqual(len(poly_simplification_margin_0.coords), 5)

        poly_simplification_margin_gt_0 = merge_polygons(
            polygons, self.margin_for_unit_pixels
        )
        self.assertEqual(poly_simplification_margin_gt_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_gt_0.geom_type, "MultiPolygon")
        self.assertEqual(len(poly_simplification_margin_gt_0.coords), 5)

    def test_merges_unit_polygons_within_rectangle(self) -> None:
        polygons = []
        for i in range(5):
            for j in range(3):
                polygons.append(
                    self._create_polygon(
                        ((j, i), (j, i + 1), (j + 1, i + 1), (j + 1, i), (j, i))
                    )
                )
        poly_no_simplification = merge_polygons(polygons, None)
        self.assertEqual(poly_no_simplification.srid, self.srid)
        self.assertEqual(poly_no_simplification.geom_type, "Polygon")
        self.assertEqual(len(poly_no_simplification.coords[0]), 17)

        poly_simplification_margin_0 = merge_polygons(polygons, 0)
        self.assertEqual(poly_simplification_margin_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_0.geom_type, "Polygon")
        # expecting 5, but if the start/end point isn't a corner, it could be 6.
        self.assertLessEqual(len(poly_simplification_margin_0.coords[0]), 6)
        self.assertGreaterEqual(len(poly_simplification_margin_0.coords[0]), 5)

        poly_simplification_margin_gt_0 = merge_polygons(
            polygons, self.margin_for_unit_pixels
        )
        self.assertEqual(poly_simplification_margin_gt_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_gt_0.geom_type, "Polygon")
        # expecting 5, but if the start/end point isn't a corner, it could be 6.
        self.assertLessEqual(len(poly_simplification_margin_gt_0.coords[0]), 6)
        self.assertGreaterEqual(len(poly_simplification_margin_gt_0.coords[0]), 5)

    def test_merges_unit_polygons_within_right_triangle(self) -> None:
        polygons = []
        for i in range(5):
            for j in range(0, i + 1):
                polygons.append(
                    self._create_polygon(
                        ((j, i), (j, i + 1), (j + 1, i + 1), (j + 1, i), (j, i))
                    )
                )
        poly_no_simplification = merge_polygons(polygons, None)
        self.assertEqual(poly_no_simplification.srid, self.srid)
        self.assertEqual(poly_no_simplification.geom_type, "Polygon")
        self.assertEqual(len(poly_no_simplification.coords[0]), 21)

        poly_simplification_margin_0 = merge_polygons(polygons, 0)
        self.assertEqual(poly_simplification_margin_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_0.geom_type, "Polygon")
        self.assertEqual(len(poly_simplification_margin_0.coords[0]), 13)

        poly_simplification_margin_gt_0 = merge_polygons(
            polygons, self.margin_for_unit_pixels
        )
        self.assertEqual(poly_simplification_margin_gt_0.srid, self.srid)
        self.assertEqual(poly_simplification_margin_gt_0.geom_type, "Polygon")
        # expecting 5, but if the start/end point isn't a corner, it could be 6.
        self.assertLessEqual(len(poly_simplification_margin_gt_0.coords[0]), 6)
        self.assertGreaterEqual(len(poly_simplification_margin_gt_0.coords[0]), 5)

    # -------------------------------------------------------
    # The following tests are for validating input parameters
    # -------------------------------------------------------

    def test_raises_error_for_negative_simplify_margin(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        p2 = self._create_polygon(((5, 0), (5, 3), (8, 3), (8, 0), (5, 0)))
        with self.assertRaises(Exception) as context:
            merge_polygons([p1, p2], -5)
        self.assertEqual(
            str(context.exception), "parameter, simpify_margin, must be gte 0"
        )

    def test_returns_none_for_empty_polygons_list(self) -> None:
        poly = merge_polygons([], 0)
        self.assertIsNone(poly)

    def test_raises_error_for_polygons_with_different_srids(self) -> None:
        p1 = self._create_polygon(((0, 0), (0, 5), (5, 5), (5, 0), (0, 0)))
        p2 = self._create_polygon(((5, 0), (5, 3), (8, 3), (8, 0), (5, 0)))
        p2.srid = 4632
        with self.assertRaises(Exception) as context:
            merge_polygons([p1, p2], 0)
        self.assertEqual(
            str(context.exception), "merge_polygon input polygons have different SRID's"
        )

    # ---------------------
    # Test helper functions
    # ---------------------

    def _create_polygon(self, pixel_coords: list[tuple[int, int]]) -> Polygon:
        coords = []
        for coord in pixel_coords:
            coords.append(self._pixel_tuple_to_coord(coord))
        poly = Polygon(coords)
        poly.srid = self.srid
        return poly

    def _pixel_tuple_to_coord(self, pixel: tuple[int, int]) -> tuple[float, float]:
        return (
            self.xorig + pixel[0] * self.xscale,
            self.yorig + pixel[1] * self.yscale,
        )

    def _coords_to_sorted_pixel_coords(
        self, coords: tuple[tuple[float, float]]
    ) -> tuple[tuple[int, int]]:
        pixel_coords = []
        for coord in coords:
            pixel_coords.append(self._coord_tuple_to_pixel(coord))
        return sorted(set(pixel_coords))

    def _coord_tuple_to_pixel(self, coord: tuple[float, float]) -> tuple[int, int]:
        return (
            int((coord[0] - self.xorig) / self.xscale),
            int((coord[1] - self.yorig) / self.yscale),
        )
