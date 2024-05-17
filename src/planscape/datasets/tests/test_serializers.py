from rest_framework.test import APITestCase
from datasets.models import Dataset
from organizations.models import Organization
from datasets.serializers import DatasetSerializer, DatasetDetailSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class DatasetSerializerTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.organization = Organization.objects.create(
            name="Test Org", created_by=self.user
        )
        self.dataset_data = {
            "uuid": "123e4567-e89b-12d3-a456-426614174000",
            "organization": self.organization,
            "name": "Test Dataset",
            "type": "VECTOR",
            "blob_status": "READY",
            "url": "http://example.com/dataset",
            "created_by": self.user,
        }
        self.dataset = Dataset.objects.create(**self.dataset_data)

    def test_dataset_serializer(self):
        serializer = DatasetSerializer(instance=self.dataset)
        data = serializer.data
        self.assertEqual(data["uuid"], str(self.dataset.uuid))
        self.assertEqual(data["organization"], str(self.dataset.organization.uuid))
        self.assertEqual(data["name"], self.dataset.name)
        self.assertEqual(data["type"], self.dataset.type)
        self.assertEqual(data["blob_status"], self.dataset.blob_status)
        self.assertEqual(data["url"], self.dataset.url)

    def test_dataset_detail_serializer(self):
        serializer = DatasetDetailSerializer(instance=self.dataset)
        data = serializer.data
        self.assertEqual(data["uuid"], str(self.dataset.uuid))
        self.assertEqual(data["organization"], str(self.dataset.organization.uuid))
        self.assertEqual(data["name"], self.dataset.name)
        self.assertEqual(data["type"], self.dataset.type)
        self.assertEqual(data["blob_status"], self.dataset.blob_status)
        self.assertEqual(data["url"], self.dataset.url)
