from urllib.parse import urlencode

from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.tests.factories import OrganizationFactory
from planscape.tests.factories import UserFactory
from rest_framework.test import APITestCase

from datasets.models import DataLayer, DataLayerType, VisibilityOptions
from datasets.tests.factories import DataLayerFactory, DatasetFactory, StyleFactory
from workspaces.tests.factories import WorkspaceFactory

User = get_user_model()


class TestDataLayerViewSet(APITestCase):
    def setUp(self) -> None:
        DataLayer.objects.all().delete()  # Delete hard coded Datalayers
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
        self.client.force_authenticate(user=self.normal)
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, type=DataLayerType.RASTER
        )
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
        self.client.force_authenticate(user=self.normal)
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, type=DataLayerType.RASTER
        )
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
        self.client.force_authenticate(user=self.normal)
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        for i in range(10):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Foo {i}", type=DataLayerType.RASTER
            )
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Bar {i}", type=DataLayerType.RASTER
            )
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
        self.client.force_authenticate(user=self.normal)
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
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
        self.client.force_authenticate(user=self.normal)
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        for i in range(10):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Foo {i}", type=DataLayerType.RASTER
            )
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Bar {i}", type=DataLayerType.RASTER
            )
        filter = {
            "search": "West coast",
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(21, data.get("count"))

    def test_filter_by_full_text_search_organization_name(self):
        self.client.force_authenticate(user=self.normal)
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        for i in range(10):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Foo {i}", type=DataLayerType.RASTER
            )
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Bar {i}", type=DataLayerType.RASTER
            )
        filter = {
            "search": "organization",
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(21, data.get("count"))

    def test_by_multiple_ids(self):
        datalayer_ids = []
        for i in range(10):
            datalayer = DataLayerFactory.create(
                dataset=self.dataset, name=f"Foo {i}", type=DataLayerType.RASTER
            )
            datalayer_ids.append(str(datalayer.pk))
        
        filter = {
            "id__in": ",".join(datalayer_ids[:3]),
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(3, data.get("count"))

    def test_get_by_normal_user_fails(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-list")
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory(dataset=dataset, type=DataLayerType.RASTER)
        response = self.client.get(url, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data.get("results")[0].get("id"))

    def test_get_dataset_with_style(self):
        self.client.force_authenticate(user=self.normal)
        style = StyleFactory.create(
            created_by=self.normal, organization=self.organization
        )
        datalayer = DataLayerFactory.create(
            dataset=self.dataset,
            name="Forest",
            style=style,
        )
        url = reverse("api:datasets:datalayers-list")
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data.get("results")[0].get("id"))
        self.assertEqual(style.pk, data.get("results")[0].get("styles")[0].get("id"))

    def test_styles_shape_is_array_for_id_in_filter(self):
        self.client.force_authenticate(user=self.normal)
        datalayer = DataLayerFactory.create(
            dataset=self.dataset,
            type=DataLayerType.VECTOR,
        )
        filter = {
            "id__in": str(datalayer.pk),
        }
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, data.get("count"))
        self.assertIsInstance(data.get("results")[0].get("styles"), list)

    def test_datalayers_list_private_as_staff_user(self):
        self.client.force_authenticate(user=self.admin)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)

        for i in range(2):
            DataLayerFactory.create(
                dataset=private_dataset, name=f"private R {i}", type=DataLayerType.RASTER
            )

        for i in range(3):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"public R {i}", type=DataLayerType.RASTER
            )

        url = reverse("api:datasets:datalayers-list")
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data.get("results")), 5)

    def test_datalayers_list_private_as_normal_user(self):
        self.client.force_authenticate(user=self.normal)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)

        for i in range(2):
            DataLayerFactory.create(
                dataset=private_dataset, name=f"private R {i}", type=DataLayerType.RASTER
            )

        for i in range(3):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"public R {i}", type=DataLayerType.RASTER
            )

        url = reverse("api:datasets:datalayers-list")
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data.get("results")), 3)

    def test_datalayers_list_workpace_related(self):
        collaborator = UserFactory.create()
        viewer = UserFactory.create()
        shared_workspace = WorkspaceFactory.create(
            owner=self.normal,
            collaborators=[collaborator],
            viewers=[viewer],
        )
        shared_dataset = DatasetFactory(
            visibility=VisibilityOptions.PRIVATE,
            workspace=shared_workspace,
        )

        hidden_workspace = WorkspaceFactory.create(
            owner=self.normal
        )
        hidden_dataset = DatasetFactory(
            visibility=VisibilityOptions.PRIVATE,
            workspace=hidden_workspace,
        )

        for i in range(5):
            DataLayerFactory.create(
                dataset=shared_dataset, 
                name=f"shared private R {i}", 
                type=DataLayerType.RASTER,
                workspace=shared_workspace
            )
            DataLayerFactory.create(
                dataset=hidden_dataset, 
                name=f"hidden private R {i}", 
                type=DataLayerType.RASTER,
                workspace=hidden_workspace
            )

        for test in [
            {"user": self.normal, "expected_result": 10},
            {"user": collaborator, "expected_result": 5},
            {"user": viewer, "expected_result": 5},
        ]:
            self.client.force_authenticate(user=test.get("user"))
            url = reverse("api:datasets:datalayers-list")
            response = self.client.get(url)
            data = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(data.get("results")), test.get("expected_result"))


    def test_retrieve_public_datalayer_succeeds(self):
        self.client.force_authenticate(user=self.normal)
        datalayer = DataLayerFactory.create(dataset=self.dataset, type=DataLayerType.RASTER)
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], datalayer.pk)

    def test_retrieve_private_datalayer_as_normal_user_returns_404(self):
        self.client.force_authenticate(user=self.normal)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)
        datalayer = DataLayerFactory.create(dataset=private_dataset, type=DataLayerType.RASTER)
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_retrieve_private_datalayer_as_staff_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)
        datalayer = DataLayerFactory.create(dataset=private_dataset, type=DataLayerType.RASTER)
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], datalayer.pk)

    def test_retrieve_unauthenticated_public_datalayer_succeeds(self):
        datalayer = DataLayerFactory.create(dataset=self.dataset, type=DataLayerType.RASTER)
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], datalayer.pk)

    def test_find_anything(self):
        self.client.force_authenticate(user=self.normal)
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        for i in range(10):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Foo {i}", type=DataLayerType.RASTER
            )
            DataLayerFactory.create(
                dataset=self.dataset, name=f"Bar {i}", type=DataLayerType.RASTER
            )
        filter = {
            "term": "foo",
            "type": "RASTER",
        }
        DataLayerFactory.create(
            dataset=self.dataset, name="Foo Vector", type=DataLayerType.VECTOR
        )
        url = f"{reverse('api:datasets:datalayers-find-anything')}?{urlencode(filter)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(10, data.get("count"))

        for row in data["results"]:
            self.assertEqual("RASTER", row["data"]["type"])

    def test_find_anything_type_vector_returns_vectors(self):
        self.client.force_authenticate(user=self.normal)
        for i in range(3):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"vefoo {i}", type=DataLayerType.VECTOR
            )
        for i in range(5):
            DataLayerFactory.create(
                dataset=self.dataset, name=f"vefoo R {i}", type=DataLayerType.RASTER
            )

        params = {"term": "vefoo", "type": DataLayerType.VECTOR}
        url = f"{reverse('api:datasets:datalayers-find-anything')}?{urlencode(params)}"
        resp = self.client.get(url)
        data = resp.json()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(3, data.get("count"))
        for row in data["results"]:
            self.assertEqual("VECTOR", row["data"]["type"])

    def test_find_anything_private_as_staff_user(self):
        self.client.force_authenticate(user=self.admin)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)

        for i in range(5):
            DataLayerFactory.create(
                dataset=private_dataset, name=f"private R {i}", type=DataLayerType.RASTER
            )

        params = {"term": "priv", "type": "RASTER"}
        url = f"{reverse('api:datasets:datalayers-find-anything')}?{urlencode(params)}"
        resp = self.client.get(url)
        data = resp.json()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(5, data.get("count"))
        
    def test_find_anything_private_as_normal_user(self):
        self.client.force_authenticate(user=self.normal)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)

        for i in range(5):
            DataLayerFactory.create(
                dataset=private_dataset, name=f"private R {i}", type=DataLayerType.RASTER
            )

        params = {"term": "priv", "type": "RASTER"}
        url = f"{reverse('api:datasets:datalayers-find-anything')}?{urlencode(params)}"
        resp = self.client.get(url)
        data = resp.json()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(0, data.get("count"))

    def test_find_anything_workpace_related(self):
        collaborator = UserFactory.create()
        viewer = UserFactory.create()
        shared_workspace = WorkspaceFactory.create(
            owner=self.normal,
            collaborators=[collaborator],
            viewers=[viewer],
        )
        shared_dataset = DatasetFactory(
            visibility=VisibilityOptions.PRIVATE,
            workspace=shared_workspace,
        )

        hidden_workspace = WorkspaceFactory.create(
            owner=self.normal
        )
        hidden_dataset = DatasetFactory(
            visibility=VisibilityOptions.PRIVATE,
            workspace=hidden_workspace,
        )

        for i in range(5):
            DataLayerFactory.create(
                dataset=shared_dataset, 
                name=f"shared private R {i}", 
                type=DataLayerType.RASTER,
                workspace=shared_workspace
            )
            DataLayerFactory.create(
                dataset=hidden_dataset, 
                name=f"hidden private R {i}", 
                type=DataLayerType.RASTER,
                workspace=hidden_workspace
            )

        for test in [
            {"user": self.normal, "expected_result": 10},
            {"user": collaborator, "expected_result": 5},
            {"user": viewer, "expected_result": 5},
        ]:
            self.client.force_authenticate(user=test.get("user"))
            params = {"term": "priv", "type": "RASTER"}
            url = f"{reverse('api:datasets:datalayers-find-anything')}?{urlencode(params)}"
            resp = self.client.get(url)
            data = resp.json()
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(data.get("count"), test.get("expected_result"))


class TestDatasetViewSet(APITestCase):
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
        ids = [row["id"] for row in data.get("results", [])]
        self.assertIn(dataset.pk, ids)

    def test_get_by_user_succeeds(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        url = reverse("api:datasets:datasets-list")
        response = self.client.get(url, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        rows = data.get("results", [])
        ids = [row["id"] for row in rows]
        self.assertIn(dataset.pk, ids)
        dataset_row = next(row for row in rows if row["id"] == dataset.pk)
        self.assertIn("modules", dataset_row)

    def test_browses_datalayers(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(dataset=dataset)
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data[0].get("id"))

    def test_browses_datalayers__filter_by_name_exact(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(dataset=dataset, name="Owl Habitat")
        query_params = {"name": datalayer.name}
        url = f"{reverse('api:datasets:datasets-browse', kwargs={'pk': dataset.pk})}?{urlencode(query_params)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data[0].get("id"))

    def test_browses_datalayers__filter_by_name_icontains(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(dataset=dataset, name="Owl Habitat")
        query_params = {"name": "owl"}
        url = f"{reverse('api:datasets:datasets-browse', kwargs={'pk': dataset.pk})}?{urlencode(query_params)}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data[0].get("id"))


class TestPublicAccess(APITestCase):
    def setUp(self) -> None:
        self.public_dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.public_datalayer = DataLayerFactory.create(dataset=self.public_dataset)

        self.private_dataset = DatasetFactory.create(visibility=VisibilityOptions.PRIVATE)
        self.private_datalayer = DataLayerFactory.create(dataset=self.private_dataset)

    def test_datasets_list_is_public(self):
        url = reverse("api:datasets:datasets-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data.get("results")), 1)

    def test_all_public_endpoints_are_readable(self):
        urls = [
            reverse("api:datasets:datasets-browse", kwargs={"pk": self.public_dataset.pk}),
            f"{reverse('api:datasets:datalayers-find-anything')}?term=x&type=RASTER",
            reverse("api:datasets:datalayers-urls", kwargs={"pk": self.public_datalayer.pk}),
        ]
        for url in urls:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 200)

    def test_private_endpoints_are_not_visible(self):
        urls = [
            reverse("api:datasets:datasets-browse", kwargs={"pk": self.private_dataset.pk}),
            reverse("api:datasets:datalayers-urls", kwargs={"pk": self.private_datalayer.pk}),
        ]
        for url in urls:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 404)

    def test_write_still_requires_authentication(self):
        url = reverse("api:datasets:datasets-list")
        resp = self.client.post(url, {})
        self.assertIn(resp.status_code, (401, 403))
