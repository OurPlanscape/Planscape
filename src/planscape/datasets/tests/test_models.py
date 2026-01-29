from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ValidationError
from django.test import TestCase
from modules.base import MODULE_HANDLERS

from datasets.models import DataLayer, validate_dataset_modules
from datasets.tests.factories import DataLayerFactory


class GeometricIntersectionTest(TestCase):
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

    def test_geometric_intersection_with_empty_intersection_returns_none(self):
        qs = DataLayer.objects.all()
        output = qs.geometric_intersection()
        self.assertIsNone(output)


class ValidateDatasetModulesTest(TestCase):
    def test_allows_none(self):
        validate_dataset_modules(None)

    def test_allows_known_modules(self):
        modules = list(MODULE_HANDLERS.keys())
        validate_dataset_modules(modules[:1])

    def test_rejects_unknown_modules(self):
        with self.assertRaises(ValidationError):
            validate_dataset_modules(["not-a-module"])


class DataLayerModelTest(TestCase):
    def setUp(self):
        # 1 DataLayer added on migrations
        DataLayerFactory.create(name="Layer 1")
        DataLayerFactory.create(name="Layer 2")
        DataLayerFactory.create(name="DataLayer 3")

    def test_find_by_name(self):
        self.assertEqual(DataLayer.objects.all().count(), 4)
        self.assertEqual(DataLayer.objects.filter(name="Layer 1").count(), 1)
        self.assertEqual(DataLayer.objects.filter(name__startswith="Layer").count(), 2)

    def test_deleted_datalayer_not_listed(self):
        deleted_datalayer = DataLayerFactory.create(name="Deleted Layer")

        self.assertEqual(DataLayer.objects.all().count(), 5)

        deleted_datalayer.delete()

        self.assertEqual(DataLayer.objects.all().count(), 4)

