from unittest import mock
from datasets.models import DataLayer, Dataset
from datasets.tests.factories import DataLayerFactory, DatasetFactory
from organizations.tests.factories import OrganizationFactory
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITransactionTestCase

from planscape.tests.factories import UserFactory

User = get_user_model()


class TestAdminDataLayerViewSet(APITransactionTestCase):
    def setUp(self) -> None:
        self.admin = UserFactory.create(is_staff=True)
        self.normal = UserFactory.create()
        self.dataset = DatasetFactory.create()

    def test_list_by_normal_user_fails(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:admin-datasets:datalayers-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_list_by_admin_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datalayers-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_create_by_normal_user_fails(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:admin-datasets:datalayers-list")
        data = {
            "name": "my dataset",
            "dataset": self.dataset.pk,
            "organization": self.dataset.organization.pk,
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(0, DataLayer.objects.all().count())

    @mock.patch(
        "datasets.services.create_upload_url",
        return_value={"url": "foo"},
    )
    def test_create_by_admin_user_succeeds(self, _create_upload_url):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datalayers-list")
        data = {
            "name": "my dataset",
            "dataset": self.dataset.pk,
            "organization": self.dataset.organization.pk,
            "original_name": "foo",
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(1, DataLayer.objects.all().count())


class TestAdminDatasetViewSet(APITransactionTestCase):
    def setUp(self) -> None:
        self.admin = UserFactory.create(is_staff=True)
        self.normal = UserFactory.create()
        self.org = OrganizationFactory.create(created_by=self.admin)

    def test_list_by_normal_user_fails(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:admin-datasets:datasets-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_list_by_admin_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datasets-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_create_by_normal_user_fails(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:admin-datasets:datasets-list")
        data = {
            "name": "my dataset",
            "visibility": "PUBLIC",
            "organization": self.org.pk,
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(0, Dataset.objects.all().count())

    def test_create_by_admin_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datasets-list")
        data = {
            "name": "my dataset",
            "visibility": "PUBLIC",
            "organization": self.org.pk,
            "original_name": "foo.tif",
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(1, Dataset.objects.all().count())
