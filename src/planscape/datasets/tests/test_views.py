from unittest import mock
from urllib.parse import urlencode

from datasets.models import (
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    PreferredDisplayType,
    SearchTab,
    VisibilityOptions,
    WorkspaceFavoriteDataLayer,
)
from datasets.tests.factories import (
    DataLayerFactory,
    DatasetFactory,
    SimpleCategoryFactory,
    StyleFactory,
)
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.tests.factories import OrganizationFactory
from rest_framework.test import APITestCase
from workspaces.models import WorkspaceRole
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
    WorkspaceFactory,
)

from planscape.tests.factories import UserFactory

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

    @mock.patch("planscape.filters.track_event")
    def test_full_text_search_tracks_search_event(self, track_event_mock):
        # `search` on this endpoint is handled ad hoc in get_queryset(), not
        # through the FilterSet - confirms it's still tracked via
        # DataLayerViewSet.tracked_query_params.
        self.client.force_authenticate(user=self.normal)
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        filter = {"search": "Forest"}
        url = f"{reverse('api:datasets:datalayers-list')}?{urlencode(filter)}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_called_once_with(
            name="search.filtered",
            properties={
                "resource": "DataLayer",
                "params": {"search": "Forest"},
                "email": self.normal.email,
            },
            user_id=self.normal.pk,
        )

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
                dataset=private_dataset,
                name=f"private R {i}",
                type=DataLayerType.RASTER,
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
                dataset=private_dataset,
                name=f"private R {i}",
                type=DataLayerType.RASTER,
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

        hidden_workspace = WorkspaceFactory.create(owner=self.normal)
        hidden_dataset = DatasetFactory(
            visibility=VisibilityOptions.PRIVATE,
            workspace=hidden_workspace,
        )

        for i in range(5):
            DataLayerFactory.create(
                dataset=shared_dataset,
                name=f"shared private R {i}",
                type=DataLayerType.RASTER,
                workspace=shared_workspace,
            )
            DataLayerFactory.create(
                dataset=hidden_dataset,
                name=f"hidden private R {i}",
                type=DataLayerType.RASTER,
                workspace=hidden_workspace,
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
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, type=DataLayerType.RASTER
        )
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], datalayer.pk)

    def test_retrieve_private_datalayer_as_normal_user_returns_404(self):
        self.client.force_authenticate(user=self.normal)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)
        datalayer = DataLayerFactory.create(
            dataset=private_dataset, type=DataLayerType.RASTER
        )
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_retrieve_private_datalayer_as_staff_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)
        datalayer = DataLayerFactory.create(
            dataset=private_dataset, type=DataLayerType.RASTER
        )
        url = reverse("api:datasets:datalayers-detail", kwargs={"pk": datalayer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], datalayer.pk)

    def test_retrieve_unauthenticated_public_datalayer_succeeds(self):
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, type=DataLayerType.RASTER
        )
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
        params = {
            "term": "foo",
            "type": "RASTER",
        }
        DataLayerFactory.create(
            dataset=self.dataset, name="Foo Vector", type=DataLayerType.VECTOR
        )
        url = reverse("api:datasets:datalayers-find-anything")
        response = self.client.post(url, params, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(10, data.get("count"))

        for row in data["results"]:
            self.assertEqual("RASTER", row["data"]["type"])

    @mock.patch("datasets.views.find_anything", return_value={})
    def test_find_anything_passes_group_by(self, find_anything_mock):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")
        params = {"term": "foo", "type": "RASTER", "group_by": "dataset"}

        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(find_anything_mock.call_args.kwargs["group_by"], "dataset")

    def test_find_anything_rejects_unknown_group_by(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")
        params = {"term": "foo", "type": "RASTER", "group_by": "organization"}

        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("group_by", response.json()["errors"])

    @mock.patch("datasets.views.track_event")
    def test_find_anything_tracks_search_event(self, track_event_mock):
        self.client.force_authenticate(user=self.normal)
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        params = {"term": "forest", "type": "RASTER"}
        url = reverse("api:datasets:datalayers-find-anything")
        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_called_once_with(
            name="datasets.datalayer.find_anything",
            properties={
                "term": "forest",
                "type": "RASTER",
                "module": None,
                "result_count": 1,
                "email": self.normal.email,
            },
            user_id=self.normal.pk,
        )

    @mock.patch("datasets.views.track_event")
    def test_find_anything_tracks_anonymous_search(self, track_event_mock):
        DataLayerFactory.create(
            dataset=self.dataset, name="Forest", type=DataLayerType.RASTER
        )
        params = {"term": "forest", "type": "RASTER"}
        url = reverse("api:datasets:datalayers-find-anything")
        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_called_once_with(
            name="datasets.datalayer.find_anything",
            properties={
                "term": "forest",
                "type": "RASTER",
                "module": None,
                "result_count": 1,
                "email": None,
            },
            user_id=None,
        )

    def test_find_anything_is_post_only(self):
        url = reverse("api:datasets:datalayers-find-anything")
        response = self.client.get(url, {"term": "forest", "type": "RASTER"})
        self.assertEqual(response.status_code, 405)

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
        url = reverse("api:datasets:datalayers-find-anything")
        resp = self.client.post(url, params, format="json")
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
                dataset=private_dataset,
                name=f"private R {i}",
                type=DataLayerType.RASTER,
            )

        params = {"term": "priv", "type": "RASTER"}
        url = reverse("api:datasets:datalayers-find-anything")
        resp = self.client.post(url, params, format="json")
        data = resp.json()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(5, data.get("count"))

    def test_find_anything_private_as_normal_user(self):
        self.client.force_authenticate(user=self.normal)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)

        for i in range(5):
            DataLayerFactory.create(
                dataset=private_dataset,
                name=f"private R {i}",
                type=DataLayerType.RASTER,
            )

        params = {"term": "priv", "type": "RASTER"}
        url = reverse("api:datasets:datalayers-find-anything")
        resp = self.client.post(url, params, format="json")
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

        hidden_workspace = WorkspaceFactory.create(owner=self.normal)
        hidden_dataset = DatasetFactory(
            visibility=VisibilityOptions.PRIVATE,
            workspace=hidden_workspace,
        )

        for i in range(5):
            DataLayerFactory.create(
                dataset=shared_dataset,
                name=f"shared private R {i}",
                type=DataLayerType.RASTER,
                workspace=shared_workspace,
            )
            DataLayerFactory.create(
                dataset=hidden_dataset,
                name=f"hidden private R {i}",
                type=DataLayerType.RASTER,
                workspace=hidden_workspace,
            )

        for test in [
            {"user": self.normal, "expected_result": 10},
            {"user": collaborator, "expected_result": 5},
            {"user": viewer, "expected_result": 5},
        ]:
            self.client.force_authenticate(user=test.get("user"))
            params = {"term": "priv", "type": "RASTER"}
            url = reverse("api:datasets:datalayers-find-anything")
            resp = self.client.post(url, params, format="json")
            data = resp.json()
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(data.get("count"), test.get("expected_result"))

    def test_find_anything_favorites_returns_workspace_favorites(self):
        collaborator = UserFactory.create()
        viewer = UserFactory.create()
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        UserAccessWorkspaceFactory.create(
            user=collaborator, workspace=workspace, role=WorkspaceRole.COLLABORATOR
        )
        UserAccessWorkspaceFactory.create(
            user=viewer, workspace=workspace, role=WorkspaceRole.VIEWER
        )
        favorite = DataLayerFactory.create(
            dataset=self.dataset, name="Fire favorite", type=DataLayerType.RASTER
        )
        DataLayerFactory.create(
            dataset=self.dataset, name="Fire not favorite", type=DataLayerType.RASTER
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=favorite
        )
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        other_favorite = DataLayerFactory.create(
            dataset=self.dataset, name="Fire elsewhere", type=DataLayerType.RASTER
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=other_workspace, datalayer=other_favorite
        )
        url = reverse("api:datasets:datalayers-find-anything")
        params = {
            "term": "fire",
            "type": "RASTER",
            "search_tab": SearchTab.FAVORITES,
            "workspace_id": workspace.pk,
        }

        for user in (self.normal, collaborator, viewer):
            self.client.force_authenticate(user=user)
            response = self.client.post(url, params, format="json")

            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["count"], 1)
            self.assertEqual(data["results"][0]["id"], favorite.pk)

    def test_find_anything_favorites_requires_workspace(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")
        params = {"term": "fire", "type": "RASTER", "search_tab": "favorites"}

        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.json()["errors"])

    def test_find_anything_favorites_rejects_inaccessible_workspace(self):
        workspace = PlanningWorkspaceFactory.create()
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")
        params = {
            "term": "fire",
            "type": "RASTER",
            "search_tab": "favorites",
            "workspace_id": workspace.pk,
        }

        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 400)

    def test_find_anything_favorites_anonymous_is_rejected(self):
        workspace = PlanningWorkspaceFactory.create()
        url = reverse("api:datasets:datalayers-find-anything")
        params = {
            "term": "fire",
            "type": "RASTER",
            "search_tab": "favorites",
            "workspace_id": workspace.pk,
        }

        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 400)

    def test_find_anything_is_favorite(self):
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        favorite = DataLayerFactory.create(
            dataset=self.dataset, name="Fire favorite", type=DataLayerType.RASTER
        )
        not_favorite = DataLayerFactory.create(
            dataset=self.dataset, name="Fire not favorite", type=DataLayerType.RASTER
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=favorite
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=other_workspace, datalayer=not_favorite
        )
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")
        params = {"term": "fire", "type": "RASTER", "workspace_id": workspace.pk}

        response = self.client.post(url, params, format="json")

        self.assertEqual(response.status_code, 200)
        is_favorite = {
            row["id"]: row["data"]["is_favorite"]
            for row in response.json()["results"]
            if row["type"] == "DATALAYER"
        }
        self.assertEqual(is_favorite, {favorite.pk: True, not_favorite.pk: False})

    def test_find_anything_is_favorite_null_without_workspace(self):
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, name="Fire", type=DataLayerType.RASTER
        )
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")

        response = self.client.post(
            url, {"term": "fire", "type": "RASTER"}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], datalayer.pk)
        self.assertIsNone(results[0]["data"]["is_favorite"])

    def test_find_anything_is_favorite_reflects_new_favorites(self):
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        datalayer = DataLayerFactory.create(
            dataset=self.dataset, name="Fire", type=DataLayerType.RASTER
        )
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-find-anything")
        params = {"term": "fire", "type": "RASTER", "workspace_id": workspace.pk}

        response = self.client.post(url, params, format="json")
        self.assertIs(response.json()["results"][0]["data"]["is_favorite"], False)

        favorite_url = reverse(
            "api:workspaces:workspaces-favorite-datalayer",
            kwargs={"pk": workspace.pk, "datalayer_id": datalayer.pk},
        )
        self.assertEqual(self.client.post(favorite_url).status_code, 201)

        response = self.client.post(url, params, format="json")
        self.assertIs(response.json()["results"][0]["data"]["is_favorite"], True)

    def _favorite(self, workspace, **kwargs):
        datalayer = DataLayerFactory.create(**kwargs)
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=datalayer
        )
        return datalayer

    def test_browse_returns_workspace_favorites_across_datasets(self):
        viewer = UserFactory.create()
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        UserAccessWorkspaceFactory.create(
            user=viewer, workspace=workspace, role=WorkspaceRole.VIEWER
        )
        other_dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        second = self._favorite(workspace, dataset=other_dataset, name="B layer")
        first = self._favorite(workspace, dataset=self.dataset, name="A layer")
        DataLayerFactory.create(dataset=self.dataset)
        self._favorite(
            PlanningWorkspaceFactory.create(created_by=self.normal),
            dataset=self.dataset,
        )
        url = reverse("api:datasets:datalayers-browse")
        params = {"search_tab": "favorites", "workspace_id": workspace.pk}

        for user in (self.normal, viewer):
            self.client.force_authenticate(user=user)
            response = self.client.post(url, params, format="json")

            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual([row["id"] for row in data], [first.pk, second.pk])
            self.assertTrue(all(row["is_favorite"] is True for row in data))

    def test_browse_excludes_inaccessible_and_not_ready_favorites(self):
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        favorite = self._favorite(workspace, dataset=self.dataset)
        self._favorite(
            workspace,
            dataset=DatasetFactory.create(visibility=VisibilityOptions.PRIVATE),
        )
        self._favorite(workspace, dataset=self.dataset, status=DataLayerStatus.PENDING)
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-browse")

        response = self.client.post(
            url,
            {"search_tab": "favorites", "workspace_id": workspace.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()], [favorite.pk])

    def test_browse_filters_by_type(self):
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        raster = self._favorite(
            workspace, dataset=self.dataset, type=DataLayerType.RASTER
        )
        self._favorite(workspace, dataset=self.dataset, type=DataLayerType.VECTOR)
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-browse")

        response = self.client.post(
            url,
            {
                "search_tab": "favorites",
                "workspace_id": workspace.pk,
                "type": "RASTER",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()], [raster.pk])

    def test_browse_only_supports_favorites_tab(self):
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-browse")

        for params in (
            {"workspace_id": workspace.pk},
            {"search_tab": "general", "workspace_id": workspace.pk},
        ):
            response = self.client.post(url, params, format="json")

            self.assertEqual(response.status_code, 400)
            self.assertIn("search_tab", response.json()["errors"])

    def test_browse_requires_workspace(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-browse")

        response = self.client.post(url, {"search_tab": "favorites"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.json()["errors"])

    def test_browse_rejects_inaccessible_workspace(self):
        workspace = PlanningWorkspaceFactory.create()
        url = reverse("api:datasets:datalayers-browse")
        params = {"search_tab": "favorites", "workspace_id": workspace.pk}

        response = self.client.post(url, params, format="json")
        self.assertEqual(response.status_code, 400)

        self.client.force_authenticate(user=self.normal)
        response = self.client.post(url, params, format="json")
        self.assertEqual(response.status_code, 400)

    def test_browse_is_post_only(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse("api:datasets:datalayers-browse")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)


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
        response = self.client.post(url, {}, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datalayer.pk, data[0].get("id"))

    def test_browse_datalayers_is_post_only(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)

    def test_browses_datalayers__filter_by_type(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(dataset=dataset, type=DataLayerType.RASTER)
        DataLayerFactory.create(dataset=dataset, type=DataLayerType.VECTOR)
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})
        response = self.client.post(url, {"type": "RASTER"}, format="json")
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual([datalayer.pk], [row.get("id") for row in data])

    def test_browses_datalayers_favorites_returns_workspace_favorites(self):
        self.client.force_authenticate(user=self.normal)
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        favorite = DataLayerFactory.create(dataset=dataset, type=DataLayerType.RASTER)
        other_favorite = DataLayerFactory.create(
            dataset=dataset, type=DataLayerType.RASTER
        )
        DataLayerFactory.create(dataset=dataset, type=DataLayerType.RASTER)
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=favorite
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=other_workspace, datalayer=other_favorite
        )
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})
        response = self.client.post(
            url,
            {
                "type": "RASTER",
                "search_tab": "favorites",
                "workspace_id": workspace.pk,
            },
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual([favorite.pk], [row.get("id") for row in data])

    def test_browses_datalayers_favorites_requires_workspace(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})
        response = self.client.post(
            url,
            {"type": "RASTER", "search_tab": "favorites"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.json()["errors"])

    def test_browses_datalayers_favorites_rejects_inaccessible_workspace(self):
        self.client.force_authenticate(user=self.normal)
        workspace = PlanningWorkspaceFactory.create()
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})
        response = self.client.post(
            url,
            {
                "type": "RASTER",
                "search_tab": "favorites",
                "workspace_id": workspace.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_browses_datalayers_is_favorite(self):
        self.client.force_authenticate(user=self.normal)
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        favorite = DataLayerFactory.create(dataset=dataset, type=DataLayerType.RASTER)
        not_favorite = DataLayerFactory.create(
            dataset=dataset, type=DataLayerType.RASTER
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=favorite
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=other_workspace, datalayer=not_favorite
        )
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})

        response = self.client.post(
            url, {"type": "RASTER", "workspace_id": workspace.pk}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row["id"]: row["is_favorite"] for row in response.json()},
            {favorite.pk: True, not_favorite.pk: False},
        )

    def test_browses_datalayers_is_favorite_null_without_workspace(self):
        self.client.force_authenticate(user=self.normal)
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        DataLayerFactory.create(dataset=dataset, type=DataLayerType.RASTER)
        url = reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk})

        response = self.client.post(url, {"type": "RASTER"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()[0]["is_favorite"])


class TestSimpleCategoryViewSet(APITestCase):
    def setUp(self) -> None:
        self.normal = UserFactory.create()

    def test_browse_returns_datalayers_linked_to_simple_category(self):
        self.client.force_authenticate(user=self.normal)
        category = SimpleCategoryFactory.create(icon="layers")
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        DataLayerFactory.create(dataset=dataset, type=DataLayerType.RASTER)

        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})
        response = self.client.post(url, {"type": "RASTER"}, format="json")
        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual([datalayer.pk], [row.get("id") for row in data])
        self.assertEqual(
            [{"id": category.pk, "name": category.name, "icon": "layers"}],
            data[0].get("simple_categories"),
        )

    def test_browse_filters_by_module(self):
        self.client.force_authenticate(user=self.normal)
        category = SimpleCategoryFactory.create()
        dataset = DatasetFactory(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        included = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={"modules": {"map": {"enabled": True}}},
            simple_categories=[category],
        )
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={"modules": {"map": {"enabled": False}}},
            simple_categories=[category],
        )

        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})
        response = self.client.post(
            url,
            {"type": "RASTER", "module": "map"},
            format="json",
        )
        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual([included.pk], [row.get("id") for row in data])

    def test_browse_does_not_return_private_datalayers_to_unauthorized_user(self):
        self.client.force_authenticate(user=self.normal)
        category = SimpleCategoryFactory.create()
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)
        DataLayerFactory.create(
            dataset=private_dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )

        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})
        response = self.client.post(url, {"type": "RASTER"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([], response.json())

    def test_browse_favorites_returns_workspace_favorites(self):
        viewer = UserFactory.create()
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        UserAccessWorkspaceFactory.create(
            user=viewer, workspace=workspace, role=WorkspaceRole.VIEWER
        )
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        category = SimpleCategoryFactory.create()
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        favorite = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        other_favorite = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=favorite
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=other_workspace, datalayer=other_favorite
        )
        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})
        params = {
            "type": "RASTER",
            "search_tab": "favorites",
            "workspace_id": workspace.pk,
        }

        for user in (self.normal, viewer):
            self.client.force_authenticate(user=user)
            response = self.client.post(url, params, format="json")

            self.assertEqual(response.status_code, 200)
            self.assertEqual([favorite.pk], [row.get("id") for row in response.json()])

    def test_browse_favorites_requires_workspace(self):
        self.client.force_authenticate(user=self.normal)
        category = SimpleCategoryFactory.create()
        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})
        response = self.client.post(
            url,
            {"type": "RASTER", "search_tab": "favorites"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.json()["errors"])

    def test_browse_is_favorite(self):
        self.client.force_authenticate(user=self.normal)
        workspace = PlanningWorkspaceFactory.create(created_by=self.normal)
        category = SimpleCategoryFactory.create()
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        favorite = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        not_favorite = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=favorite
        )
        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})

        response = self.client.post(
            url, {"type": "RASTER", "workspace_id": workspace.pk}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row["id"]: row["is_favorite"] for row in response.json()},
            {favorite.pk: True, not_favorite.pk: False},
        )

    def test_browse_is_favorite_null_without_workspace(self):
        self.client.force_authenticate(user=self.normal)
        category = SimpleCategoryFactory.create()
        dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})

        response = self.client.post(url, {"type": "RASTER"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()[0]["is_favorite"])

    def test_browse_is_post_only(self):
        category = SimpleCategoryFactory.create()
        url = reverse("api:datasets:categories-browse", kwargs={"pk": category.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)


class TestPublicAccess(APITestCase):
    def setUp(self) -> None:
        self.public_dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.public_datalayer = DataLayerFactory.create(dataset=self.public_dataset)

        self.private_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PRIVATE
        )
        self.private_datalayer = DataLayerFactory.create(dataset=self.private_dataset)

    def test_datasets_list_is_public(self):
        url = reverse("api:datasets:datasets-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data.get("results")), 1)

    def test_all_public_endpoints_are_readable(self):
        post_urls = [
            (
                reverse(
                    "api:datasets:datasets-browse",
                    kwargs={"pk": self.public_dataset.pk},
                ),
                {},
            ),
            (
                reverse("api:datasets:datalayers-find-anything"),
                {"term": "x", "type": "RASTER"},
            ),
        ]
        get_urls = [
            reverse(
                "api:datasets:datalayers-urls", kwargs={"pk": self.public_datalayer.pk}
            ),
        ]
        for url, data in post_urls:
            with self.subTest(url=url):
                resp = self.client.post(url, data, format="json")
                self.assertEqual(resp.status_code, 200)
        for url in get_urls:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 200)

    def test_private_endpoints_are_not_visible(self):
        post_urls = [
            reverse(
                "api:datasets:datasets-browse", kwargs={"pk": self.private_dataset.pk}
            ),
        ]
        get_urls = [
            reverse(
                "api:datasets:datalayers-urls", kwargs={"pk": self.private_datalayer.pk}
            ),
        ]
        for url in post_urls:
            with self.subTest(url=url):
                resp = self.client.post(url, {}, format="json")
                self.assertEqual(resp.status_code, 404)
        for url in get_urls:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 404)

    def test_funding_report_datalayer_urls_are_accessible(self):
        dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PRIVATE,
            modules=["funding_report"],
        )
        datalayer = DataLayerFactory.create(dataset=dataset)
        url = reverse("api:datasets:datalayers-urls", kwargs={"pk": datalayer.pk})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

    def test_write_still_requires_authentication(self):
        url = reverse("api:datasets:datasets-list")
        resp = self.client.post(url, {})
        self.assertIn(resp.status_code, (401, 403))


ENABLED_EVERYWHERE = {
    "modules": {
        "map": {"enabled": True},
        "advanced_stand_level_constraint": {"enabled": True},
    }
}


class UploadedTabTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        # the catalog lives in a DATA workspace the user also belongs to
        self.catalog_workspace = WorkspaceFactory.create()
        UserAccessWorkspaceFactory.create(
            user=self.user,
            workspace=self.catalog_workspace,
            role=WorkspaceRole.COLLABORATOR,
        )
        self.catalog = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            workspace=self.catalog_workspace,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        DataLayerFactory.create(
            dataset=self.catalog,
            workspace=self.catalog_workspace,
            name="Canopy catalog",
            type=DataLayerType.RASTER,
            metadata=ENABLED_EVERYWHERE,
        )
        # catalog data from before workspaces has none
        self.legacy = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        DataLayerFactory.create(
            dataset=self.legacy,
            name="Canopy legacy",
            type=DataLayerType.RASTER,
            metadata=ENABLED_EVERYWHERE,
        )
        self.uploads = DatasetFactory.create(
            visibility=VisibilityOptions.PRIVATE,
            workspace=self.workspace,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        # like the admin API creates them: only the dataset has the workspace
        self.upload = DataLayerFactory.create(
            dataset=self.uploads,
            name="Canopy upload",
            type=DataLayerType.RASTER,
            metadata=ENABLED_EVERYWHERE,
        )
        DataLayerFactory.create(
            dataset=self.uploads,
            name="Canopy pending",
            type=DataLayerType.RASTER,
            status=DataLayerStatus.PENDING,
            metadata=ENABLED_EVERYWHERE,
        )
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        self.other_uploads = DatasetFactory.create(
            visibility=VisibilityOptions.PRIVATE,
            workspace=other_workspace,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        DataLayerFactory.create(
            dataset=self.other_uploads,
            name="Canopy elsewhere",
            type=DataLayerType.RASTER,
            metadata=ENABLED_EVERYWHERE,
        )
        self.client.force_authenticate(self.user)

    def find(self, workspace_id, search_tab="uploaded", module="map"):
        return self.client.post(
            reverse("api:datasets:datalayers-find-anything"),
            {
                "term": "canopy",
                "type": "RASTER",
                "module": module,
                "search_tab": search_tab,
                "workspace_id": workspace_id,
            },
            format="json",
        )

    def browse(self, dataset, search_tab="uploaded"):
        return self.client.post(
            reverse("api:datasets:datasets-browse", kwargs={"pk": dataset.pk}),
            {
                "type": "RASTER",
                "module": "map",
                "search_tab": search_tab,
                "workspace_id": self.workspace.pk,
            },
            format="json",
        )

    def names(self, response):
        return {result["name"] for result in response.json()["results"]}

    def list_datasets(self, **params):
        url = reverse("api:datasets:datasets-list")
        return self.client.get(f"{url}?{urlencode(params)}")

    def test_find_anything_returns_only_this_workspaces_ready_uploads(self):
        response = self.find(self.workspace.pk)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            [result["name"] for result in response.json()["results"]],
            ["Canopy upload"],
        )

    def test_find_anything_finds_no_uploads_in_a_catalog_workspace(self):
        response = self.find(self.catalog_workspace.pk)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["count"], 0)

    def test_find_anything_requires_a_workspace(self):
        response = self.client.post(
            reverse("api:datasets:datalayers-find-anything"),
            {"term": "canopy", "type": "RASTER", "search_tab": "uploaded"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_browse_lists_the_uploads_of_the_upload_dataset(self):
        response = self.browse(self.uploads)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([row["name"] for row in response.json()], ["Canopy upload"])

    def test_browse_lists_nothing_from_a_catalog_dataset(self):
        response = self.browse(self.catalog)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), [])

    def test_dataset_list_has_only_datasets_with_this_workspaces_uploads(self):
        response = self.list_datasets(
            search_tab="uploaded", workspace_id=self.workspace.pk, type="RASTER"
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            [row["id"] for row in response.json()["results"]], [self.uploads.pk]
        )

    def test_dataset_list_requires_a_workspace_for_uploads(self):
        response = self.list_datasets(search_tab="uploaded")

        self.assertEqual(response.status_code, 400)

    def test_dataset_list_is_unfiltered_on_the_general_tab(self):
        response = self.list_datasets()

        self.assertEqual(response.status_code, 200, response.content)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertTrue(
            {self.catalog.pk, self.uploads.pk, self.other_uploads.pk} <= ids
        )

    def test_map_search_finds_the_catalog_and_no_uploads(self):
        response = self.find(self.workspace.pk, search_tab="general")

        self.assertEqual(response.status_code, 200, response.content)
        names = self.names(response)
        self.assertIn("Canopy catalog", names)
        self.assertIn("Canopy legacy", names)
        self.assertNotIn("Canopy upload", names)
        self.assertNotIn("Canopy elsewhere", names)

    def test_map_browse_of_an_upload_dataset_is_empty(self):
        response = self.browse(self.other_uploads, search_tab="general")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), [])

    def test_map_datasets_leave_out_uploads(self):
        response = self.client.get(
            reverse("api:modules:modules-detail", kwargs={"pk": "map"})
        )

        self.assertEqual(response.status_code, 200, response.content)
        ids = {
            row["id"] for row in response.json()["options"]["datasets"]["main_datasets"]
        }
        self.assertIn(self.catalog.pk, ids)
        self.assertIn(self.legacy.pk, ids)
        self.assertNotIn(self.uploads.pk, ids)
        self.assertNotIn(self.other_uploads.pk, ids)

    def test_other_modules_follow_the_same_tabs(self):
        module = "advanced_stand_level_constraint"

        general = self.names(self.find(self.workspace.pk, "general", module))
        uploaded = self.names(self.find(self.workspace.pk, "uploaded", module))

        self.assertIn("Canopy catalog", general)
        self.assertNotIn("Canopy upload", general)
        self.assertEqual(uploaded, {"Canopy upload"})

    def test_other_modules_list_only_catalog_datasets_but_know_upload_layers(self):
        response = self.client.get(
            reverse(
                "api:modules:modules-detail",
                kwargs={"pk": "advanced_stand_level_constraint"},
            )
        )

        self.assertEqual(response.status_code, 200, response.content)
        options = response.json()["options"]
        # chosen constraints are looked up here, uploads included
        self.assertIn(self.upload.pk, {row["id"] for row in options["datalayers"]})
        datasets = {row["id"] for row in options["datasets"]["main_datasets"]}
        self.assertIn(self.catalog.pk, datasets)
        self.assertNotIn(self.uploads.pk, datasets)
