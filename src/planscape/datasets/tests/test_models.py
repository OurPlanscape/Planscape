from django.contrib.gis.geos import GEOSGeometry
from django.test import TransactionTestCase

from datasets.models import DataLayer
from datasets.tests.factories import DataLayerFactory


class GeometricIntersectionTest(TransactionTestCase):
    def setUp(self):
        # Create two overlapping polygons
        self.poly1 = GEOSGeometry("POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))")
        self.poly2 = GEOSGeometry(
            "POLYGON((0.5 0.5, 1.5 0.5, 1.5 1.5, 0.5 1.5, 0.5 0.5))"
        )
        self.poly3 = GEOSGeometry("POLYGON((2 2, 3 2, 3 3, 2 3, 2 2))")
        self.dl1 = DataLayerFactory.create(name="Layer 1", geometry=self.poly1)
        self.dl2 = DataLayerFactory.create(name="Layer 2", geometry=self.poly2)
        self.dl3 = DataLayerFactory.create(name="Layer 3", geometry=self.poly3)

    def test_geometric_intersection1(self):
        qs = DataLayer.objects.filter(id__in=[self.dl1.id, self.dl2.id])
        intersection = qs.geometric_intersection()
        expected = self.poly1.intersection(self.poly2)
        self.assertEqual(intersection, expected)

    def test_geometric_intersection_raises(self):
        qs = DataLayer.objects.all()
        with self.assertRaises(ValueError):
            qs.geometric_intersection()
