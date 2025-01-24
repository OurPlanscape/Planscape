from unittest import mock
from urllib.parse import urlencode
from datasets.models import DataLayer, Dataset, VisibilityOptions
from datasets.tests.factories import DataLayerFactory, DatasetFactory
from organizations.tests.factories import OrganizationFactory
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITransactionTestCase

from planscape.tests.factories import UserFactory

User = get_user_model()


class TestDataLayerViewSet(APITransactionTestCase):
    def setUp(self) -> None:
        self.admin = UserFactory.create(is_staff=True)
        self.normal = UserFactory.create()
        self.organization = OrganizationFactory.create(
            created_by=self.admin, name="Green Organization"
        )
        self.dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            name="US West Coast",
            organization=self.organization,
        )

    def test_list_by_normal_user_succeeds(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_list_by_admin_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:datasets:datalayers-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_filter_by_name_exact_returns_record(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset)
        filter = {
            "name": datalayer.name,
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, data.get("count"))
        self.assertEqual(datalayer.name, data.get("results")[0].get("name"))

    def test_filter_by_name_icontains_returns_record(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset)
        filter = {
            "name__icontains": datalayer.name[:3],
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, data.get("count"))
        self.assertEqual(datalayer.name, data.get("results")[0].get("name"))

    def test_filter_by_full_text_search_datalayer_name(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset, name="Forest")
        for i in range(10):
            DataLayerFactory.create(dataset=self.dataset, name=f"Foo {i}")
            DataLayerFactory.create(dataset=self.dataset, name=f"Bar {i}")
        filter = {
            "search": "Forest",
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, data.get("count"))
        self.assertEqual(datalayer.name, data.get("results")[0].get("name"))

    def test_filter_by_full_text_search_datalayer_name_multiple_return(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset, name="Forest")
        for i in range(10):
            DataLayerFactory.create(dataset=self.dataset, name=f"Foo {i}")
            DataLayerFactory.create(dataset=self.dataset, name=f"Bar {i}")
        filter = {
            "search": "Foos",
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(10, data.get("count"))

    def test_filter_by_full_text_search_dataset_name(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset, name="Forest")
        for i in range(10):
            DataLayerFactory.create(dataset=self.dataset, name=f"Foo {i}")
            DataLayerFactory.create(dataset=self.dataset, name=f"Bar {i}")
        filter = {
            "search": "West coast",
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(21, data.get("count"))

    def test_filter_by_full_text_search_organization_name(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset, name="Forest")
        for i in range(10):
            DataLayerFactory.create(dataset=self.dataset, name=f"Foo {i}")
            DataLayerFactory.create(dataset=self.dataset, name=f"Bar {i}")
        filter = {
            "search": "organization",
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(21, data.get("count"))

    def test_get_by_normal_user_fails(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-list")
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory(dataset=dataset)
        response = self.client.get(url, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data.get("results")[0].get("id"))


class TestDatasetViewSet(APITransactionTestCase):
    def setUp(self) -> None:
        self.admin = UserFactory.create(is_staff=True)
        self.normal = UserFactory.create()
        self.org = OrganizationFactory.create(created_by=self.admin)

    def test_list_by_normal_user_succeeds(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datasets-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_list_by_admin_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:datasets:datasets-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_get_by_normal_user_succeeds(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datasets-list")
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        response = self.client.get(url, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(dataset.pk, data.get("results")[0].get("id"))

    def test_get_by_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        url = reverse("api:datasets:datasets-list")
        response = self.client.get(url, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(dataset.pk, data.get("results")[0].get("id"))
