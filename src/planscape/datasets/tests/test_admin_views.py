from unittest import mock
from urllib.parse import urlencode
from datasets.models import DataLayer, Dataset
from datasets.tests.factories import DataLayerFactory, DatasetFactory
from organizations.tests.factories import OrganizationFactory
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from planscape.tests.factories import UserFactory
from workspaces.tests.factories import WorkspaceFactory

User = get_user_model()


class TestAdminDataLayerViewSet(APITestCase):
    def setUp(self) -> None:
        DataLayer.objects.all().delete()
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

    def test_filter_by_name_exact_returns_record(self):
        self.client.force_authenticate(user=self.admin)
        datalayer = DataLayerFactory.create(dataset=self.dataset)
        filter = {
            "name": datalayer.name,
        }
        url = f"{reverse('api:admin-datasets:datalayers-list')}?{urlencode(filter)}"
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
        url = f"{reverse('api:admin-datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, data.get("count"))
        self.assertEqual(datalayer.name, data.get("results")[0].get("name"))

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
        "datasets.services.create_upload_url_s3",
        return_value={"url": "foo"},
    )
    def test_create_by_admin_user_succeeds(self, _create_upload_url):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datalayers-list")
        data = {
            "name": "my dataset",
            "dataset": self.dataset.pk,
            "type": "RASTER",
            "organization": self.dataset.organization.pk,
            "original_name": "foo",
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(1, DataLayer.objects.all().count())


class TestAdminDatasetViewSet(APITestCase):
    def setUp(self) -> None:
        self.admin = UserFactory.create(is_staff=True)
        self.normal = UserFactory.create()
        self.org = OrganizationFactory.create(created_by=self.admin)
        self.workspace = WorkspaceFactory.create()

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

    def test_create_by_admin_user_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datasets-list")
        data = {
            "name": "my dataset",
            "visibility": "PUBLIC",
            "organization": self.org.pk,
            "workspace_id": self.workspace.pk,
            "original_name": "foo.tif",
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("modules", response.json())
        self.assertEqual(1, Dataset.objects.filter(created_by=self.admin).count())
        self.assertEqual(
            self.workspace,
            Dataset.objects.get(created_by=self.admin).workspace,
        )

    def test_create_by_admin_user_without_workspace_id_fails(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-datasets:datasets-list")
        data = {
            "name": "my dataset",
            "visibility": "PUBLIC",
            "organization": self.org.pk,
        }
        response = self.client.post(url, data=data, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.json())

    def test_update_by_admin_user_updates_name_and_visibility(self):
        self.client.force_authenticate(user=self.admin)
        dataset = DatasetFactory.create(
            organization=self.org,
            workspace=self.workspace,
        )
        url = reverse("api:admin-datasets:datasets-detail", args=[dataset.pk])
        data = {
            "name": "updated dataset",
            "visibility": "PRIVATE",
        }
        response = self.client.patch(url, data=data, format="json")
        self.assertEqual(response.status_code, 200)

        dataset.refresh_from_db()
        self.assertEqual(dataset.name, "updated dataset")
        self.assertEqual(dataset.visibility, "PRIVATE")

    def test_update_by_admin_user_does_not_update_workspace(self):
        self.client.force_authenticate(user=self.admin)
        other_workspace = WorkspaceFactory.create()
        dataset = DatasetFactory.create(
            organization=self.org,
            workspace=self.workspace,
        )
        url = reverse("api:admin-datasets:datasets-detail", args=[dataset.pk])
        data = {
            "name": "updated dataset",
            "workspace_id": other_workspace.pk,
        }
        response = self.client.patch(url, data=data, format="json")
        self.assertEqual(response.status_code, 200)

        dataset.refresh_from_db()
        self.assertEqual(dataset.name, "updated dataset")
        self.assertEqual(dataset.workspace, self.workspace)
