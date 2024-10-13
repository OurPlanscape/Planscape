from django.test import TestCase
from datasets.serializers import (
    CategorySerializer,
    CategoryEmbbedSerializer,
    DatasetSerializer,
    DataLayerSerializer,
    CreateDataLayerSerializer,
)
from datasets.models import Category
from datasets.tests.factories import (
    DatasetFactory,
    DataLayerFactory,
    OrganizationFactory,
)


class CategorySerializerTest(TestCase):
    def test_category_serializer(self):
        organization = OrganizationFactory.create()
        dataset = DatasetFactory.create(organization=organization)
        category = Category.add_root(
            organization=organization,
            created_by=organization.created_by,
            dataset=dataset,
            name="My category",
        )
        serializer = CategorySerializer(category)
        data = serializer.data
        self.assertEqual(data["id"], category.id)
        self.assertEqual(data["name"], category.name)
        self.assertEqual(data["created_by"], category.created_by.id)
        self.assertEqual(data["organization"], category.organization.id)
        self.assertEqual(data["dataset"], category.dataset.id)

    def test_category_embbed_serializer(self):
        organization = OrganizationFactory.create()
        dataset = DatasetFactory.create(organization=organization)
        category = Category.add_root(
            organization=organization,
            created_by=organization.created_by,
            dataset=dataset,
            name="My category",
        )
        serializer = CategoryEmbbedSerializer(category)
        data = serializer.data
        self.assertEqual(data["id"], category.id)
        self.assertEqual(data["name"], category.name)
        self.assertIn("parent", data)
        self.assertEqual(data["depth"], category.get_depth())


class DatasetSerializerTest(TestCase):
    def test_dataset_serializer(self):
        dataset = DatasetFactory()
        serializer = DatasetSerializer(dataset)
        data = serializer.data
        self.assertEqual(data["id"], dataset.id)
        self.assertEqual(data["name"], dataset.name)
        self.assertEqual(data["created_by"], dataset.created_by.id)
        self.assertEqual(data["organization"], dataset.organization.id)
        self.assertEqual(data["visibility"], dataset.visibility)


class DataLayerSerializerTest(TestCase):
    def test_data_layer_serializer(self):
        data_layer = DataLayerFactory()
        serializer = DataLayerSerializer(data_layer)
        data = serializer.data
        self.assertEqual(data["id"], data_layer.id)
        self.assertEqual(data["name"], data_layer.name)
        self.assertEqual(data["created_by"], data_layer.created_by.id)
        self.assertEqual(data["organization"], data_layer.organization.id)
        self.assertEqual(data["dataset"], data_layer.dataset.id)
        self.assertEqual(data["status"], data_layer.status)
        self.assertEqual(data["geometry_type"], data_layer.geometry_type)
        self.assertEqual(data["type"], data_layer.type)
        self.assertIn("category", data)

    def test_create_data_layer_serializer(self):
        data_layer = DataLayerFactory()
        serializer = CreateDataLayerSerializer(data_layer)
        data = serializer.data
        self.assertEqual(data["id"], data_layer.id)
        self.assertEqual(data["name"], data_layer.name)
        self.assertEqual(data["organization"], data_layer.organization.id)
        self.assertEqual(data["dataset"], data_layer.dataset.id)
