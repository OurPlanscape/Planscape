from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ValidationError
from django.test import TestCase
from modules.base import MODULE_HANDLERS
from planscape.tests.factories import UserFactory
from workspaces.tests.factories import WorkspaceFactory

from datasets.models import (
    Category,
    DataLayer,
    Dataset,
    VisibilityOptions,
    get_dataset_ids_intersecting,
    validate_dataset_modules,
)
from datasets.tests.factories import DataLayerFactory, DatasetFactory


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


class ByMetaModuleTest(TestCase):
    def test_includes_layer_without_enabled_key(self):
        DataLayerFactory.create(metadata={"modules": {"forsys": {}}})

        self.assertEqual(DataLayer.objects.all().by_meta_module("forsys").count(), 1)

    def test_includes_layer_with_enabled_true(self):
        DataLayerFactory.create(metadata={"modules": {"forsys": {"enabled": True}}})

        self.assertEqual(DataLayer.objects.all().by_meta_module("forsys").count(), 1)

    def test_excludes_layer_with_enabled_false(self):
        DataLayerFactory.create(metadata={"modules": {"forsys": {"enabled": False}}})

        self.assertEqual(DataLayer.objects.all().by_meta_module("forsys").count(), 0)

    def test_excludes_layer_without_module_key(self):
        DataLayerFactory.create(metadata={"modules": {"other": {"enabled": True}}})

        self.assertEqual(DataLayer.objects.all().by_meta_module("forsys").count(), 0)


class DataLayerModelTest(TestCase):
    def setUp(self):
        DataLayerFactory.create(name="Layer 1")
        DataLayerFactory.create(name="Layer 2")
        DataLayerFactory.create(name="DataLayer 3")

    def test_find_by_name(self):
        self.assertEqual(DataLayer.objects.all().count(), 3)
        self.assertEqual(DataLayer.objects.filter(name="Layer 1").count(), 1)
        self.assertEqual(DataLayer.objects.filter(name__startswith="Layer").count(), 2)

    def test_deleted_datalayer_not_listed(self):
        deleted_datalayer = DataLayerFactory.create(name="Deleted Layer")

        self.assertEqual(DataLayer.objects.all().count(), 4)
        self.assertEqual(DataLayer.dead_or_alive.all().count(), 4)

        deleted_datalayer.delete()

        self.assertEqual(DataLayer.objects.all().count(), 3)
        self.assertEqual(DataLayer.dead_or_alive.all().count(), 4)

    def test_hard_delete(self):
        datalayer = DataLayerFactory.create()

        self.assertEqual(DataLayer.objects.all().count(), 4)
        self.assertEqual(DataLayer.dead_or_alive.all().count(), 4)

        datalayer.delete(hard_delete=True)

        self.assertEqual(DataLayer.objects.all().count(), 3)
        self.assertEqual(DataLayer.dead_or_alive.all().count(), 3)

    def test_has_module_returns_true_when_enabled(self):
        datalayer = DataLayerFactory.create(
            metadata={"modules": {"forsys": {"enabled": True}}}
        )

        self.assertTrue(datalayer.has_module("forsys"))

    def test_has_module_returns_true_when_enabled_key_missing(self):
        datalayer = DataLayerFactory.create(metadata={"modules": {"forsys": {}}})

        self.assertTrue(datalayer.has_module("forsys"))

    def test_has_module_returns_false_when_disabled(self):
        datalayer = DataLayerFactory.create(
            metadata={"modules": {"forsys": {"enabled": False}}}
        )

        self.assertFalse(datalayer.has_module("forsys"))

    def test_has_module_returns_false_when_module_missing(self):
        datalayer = DataLayerFactory.create(
            metadata={"modules": {"impacts": {"enabled": True}}}
        )

        self.assertFalse(datalayer.has_module("forsys"))

    def test_has_module_returns_false_when_modules_missing(self):
        datalayer = DataLayerFactory.create(metadata={})

        self.assertFalse(datalayer.has_module("forsys"))


class DatasetByOutlineIntersectsTest(TestCase):
    def setUp(self):
        self.geometry = GEOSGeometry(
            "MULTIPOLYGON(((0 0, 1 0, 1 1, 0 1, 0 0)))", srid=4269
        )
        self.inside = GEOSGeometry(
            "MULTIPOLYGON(((0.5 0.5, 2 0.5, 2 2, 0.5 2, 0.5 0.5)))", srid=4269
        )
        self.outside = GEOSGeometry(
            "MULTIPOLYGON(((5 5, 6 5, 6 6, 5 6, 5 5)))", srid=4269
        )

    def test_returns_dataset_once_when_many_datalayers_intersect(self):
        dataset = DatasetFactory.create()
        for i in range(3):
            DataLayerFactory.create(
                dataset=dataset, name=f"layer {i}", outline=self.inside
            )

        result = list(Dataset.objects.all().by_outline_intersects(self.geometry))

        self.assertEqual(result, [dataset])

    def test_excludes_dataset_without_intersecting_datalayers(self):
        dataset = DatasetFactory.create()
        DataLayerFactory.create(dataset=dataset, outline=self.outside)
        DataLayerFactory.create(dataset=dataset, name="no outline", outline=None)

        result = Dataset.objects.all().by_outline_intersects(self.geometry)

        self.assertFalse(result.exists())

    def test_ignores_deleted_datalayers(self):
        dataset = DatasetFactory.create()
        datalayer = DataLayerFactory.create(dataset=dataset, outline=self.inside)
        datalayer.delete()

        result = Dataset.objects.all().by_outline_intersects(self.geometry)

        self.assertFalse(result.exists())


class GetDatasetIdsIntersectingTest(TestCase):
    def setUp(self):
        self.geometry = GEOSGeometry(
            "MULTIPOLYGON(((0 0, 1 0, 1 1, 0 1, 0 0)))", srid=4269
        )
        self.inside = GEOSGeometry(
            "MULTIPOLYGON(((0.5 0.5, 2 0.5, 2 2, 0.5 2, 0.5 0.5)))", srid=4269
        )

    def test_reuses_cached_result_for_same_geometry(self):
        dataset = DatasetFactory.create()
        DataLayerFactory.create(dataset=dataset, outline=self.inside)

        self.assertEqual(get_dataset_ids_intersecting(self.geometry), [dataset.id])
        # Only the fingerprint query runs; the intersection comes from the cache.
        with self.assertNumQueries(1):
            self.assertEqual(
                get_dataset_ids_intersecting(self.geometry), [dataset.id]
            )

    def test_new_datalayer_invalidates_cached_result(self):
        first = DatasetFactory.create()
        DataLayerFactory.create(dataset=first, outline=self.inside)
        self.assertEqual(get_dataset_ids_intersecting(self.geometry), [first.id])

        second = DatasetFactory.create()
        DataLayerFactory.create(dataset=second, outline=self.inside)

        self.assertCountEqual(
            get_dataset_ids_intersecting(self.geometry), [first.id, second.id]
        )

    def test_deleted_datalayer_invalidates_cached_result(self):
        dataset = DatasetFactory.create()
        datalayer = DataLayerFactory.create(dataset=dataset, outline=self.inside)
        self.assertEqual(get_dataset_ids_intersecting(self.geometry), [dataset.id])

        datalayer.delete()

        self.assertEqual(get_dataset_ids_intersecting(self.geometry), [])


class DatasetAccessibleByTest(TestCase):
    def test_workspace_members_see_dataset_once(self):
        owner = UserFactory.create()
        viewer = UserFactory.create()
        outsider = UserFactory.create()
        workspace = WorkspaceFactory.create(
            owner=owner,
            collaborators=[UserFactory.create()],
            viewers=[viewer],
        )
        dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PRIVATE,
            workspace=workspace,
        )

        self.assertEqual(list(Dataset.objects.all().accessible_by(owner)), [dataset])
        self.assertEqual(list(Dataset.objects.all().accessible_by(viewer)), [dataset])
        self.assertFalse(Dataset.objects.all().accessible_by(outsider).exists())


class CategoryFullPathTest(TestCase):
    def test_returns_ancestors_and_own_name(self):
        dataset = DatasetFactory.create()
        root = Category.add_root(
            organization=dataset.organization,
            created_by=dataset.created_by,
            dataset=dataset,
            name="Root",
        )
        child = root.add_child(
            organization=dataset.organization,
            created_by=dataset.created_by,
            dataset=dataset,
            name="Child",
        )

        self.assertEqual(root._get_full_path(), ["Root"])
        self.assertEqual(child._get_full_path(), ["Root", "Child"])
