from datasets.models import Category, DataLayerType, StorageTypeChoices
from datasets.serializers import (
    BrowseDataLayerSerializer,
    CategoryEmbbedSerializer,
    CategorySerializer,
    CreateDataLayerSerializer,
    CreateStyleSerializer,
    DataLayerMetadataSerializer,
    DataLayerSerializer,
    DatasetSerializer,
)
from datasets.tests.factories import (
    DataLayerFactory,
    DatasetFactory,
    OrganizationFactory,
)
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase
from impacts.models import ImpactVariable, TreatmentPrescriptionAction
from rest_framework.test import APIRequestFactory
from utils.frontend import get_base_url, get_domain


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
        self.assertEqual(data["organization"]["id"], dataset.organization.id)
        self.assertEqual(data["organization"]["name"], dataset.organization.name)
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
        self.assertIn("public_url", data)
        self.assertIn("map_url", data)

    def test_create_data_layer_serializer(self):
        data_layer = DataLayerFactory()
        serializer = CreateDataLayerSerializer(data_layer)
        data = serializer.data
        self.assertEqual(data["id"], data_layer.id)
        self.assertEqual(data["name"], data_layer.name)
        self.assertEqual(data["organization"], data_layer.organization.id)
        self.assertEqual(data["dataset"], data_layer.dataset.id)


class DataLayerMetadataSerializerTest(TestCase):
    def test_empty_serializer_validates_ok(self):
        serializer = DataLayerMetadataSerializer(data={})
        self.assertTrue(serializer.is_valid())

    def test_modules_serializer_validates_ok(self):
        data = {
            "modules": {
                "impacts": {
                    "baseline": True,
                    "variable": ImpactVariable.CANOPY_BASE_HEIGHT,
                    "year": "2024",
                    "action": None,
                }
            }
        }
        serializer = DataLayerMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_modules_serializer_ok_no_baseline(self):
        data = {
            "modules": {
                "impacts": {
                    "baseline": False,
                    "variable": ImpactVariable.CANOPY_BASE_HEIGHT,
                    "year": "2024",
                    "action": TreatmentPrescriptionAction.HEAVY_MASTICATION,
                }
            }
        }
        serializer = DataLayerMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_modules_serializer_fails(self):
        data = {
            "modules": {
                "impacts": {
                    "baseline": True,
                    "variable": ImpactVariable.CANOPY_BASE_HEIGHT,
                    "year": "2024",
                    "action": TreatmentPrescriptionAction.HEAVY_MASTICATION,
                }
            }
        }
        serializer = DataLayerMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class TestCreateStyleSerializer(TestCase):
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.request = APIRequestFactory().request()
        self.request.user = self.user
        self.style = {
            "no_data": {
                "values": [],
                "color": "#000000",
                "opacity": 0,
            },
            "entries": [
                {
                    "value": 1,
                    "color": "#ff0000",
                    "opacity": 1,
                }
            ],
            "type": "RAMP",
        }
        self.valid_payload = {
            "organization": self.organization.pk,
            "name": "Test Style",
            "type": DataLayerType.RASTER,
            "data": self.style,
        }
        self.invalid_payload_no_type = {
            "organization": self.organization.pk,
            "name": "Test Style",
            "data": self.style,
        }
        self.invalid_payload_vector_type = {
            "organization": self.organization.pk,
            "name": "Test Style",
            "type": "VECTOR",
            "data": self.style,
        }

    def test_valid_data(self):
        serializer = CreateStyleSerializer(
            data=self.valid_payload,
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid())

    def test_invalid_data_no_type(self):
        serializer = CreateStyleSerializer(
            data=self.invalid_payload_no_type,
            context={"request": self.request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["type"]))

    def test_invalid_data_vector_type(self):
        serializer = CreateStyleSerializer(
            data=self.invalid_payload_vector_type,
            context={"request": self.request},
        )
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["global"]))


class MapURLTests(TestCase):
    def _expected_dynamic_url(self, layer):
        base = get_base_url(settings.ENV) or f"https://{get_domain(settings.ENV)}"
        return f"{base}/tiles/dynamic?layer={layer.id}"

    def test_get_map_url_logic(self):
        raster = DataLayerFactory(type=DataLayerType.RASTER)
        self.assertEqual(raster.get_map_url(), raster.get_public_url())

        vector = DataLayerFactory(
            type=DataLayerType.VECTOR,
            storage_type=StorageTypeChoices.DATABASE,
            table="datastore.foo_bar",
        )
        self.assertEqual(vector.get_map_url(), self._expected_dynamic_url(vector))

    def test_map_url_present_in_serializers(self):
        vector = DataLayerFactory(
            type=DataLayerType.VECTOR,
            storage_type=StorageTypeChoices.DATABASE,
            table="datastore.foo_bar",
        )
        for Serializer in (DataLayerSerializer, BrowseDataLayerSerializer):
            self.assertIn("map_url", Serializer(vector).data)
