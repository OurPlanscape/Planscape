from urllib.parse import urlencode

from django.urls import reverse
from rest_framework.test import APITestCase

from datasets.models import VisibilityOptions
from planscape.tests.factories import UserFactory
from workspaces.models import UserAccessWorkspace, WorkspaceRole
from workspaces.tests.factories import UserAccessWorkspaceFactory, WorkspaceFactory

LIST_URL = "api:admin-workspaces:workspaces-list"
DETAIL_URL = "api:admin-workspaces:workspaces-detail"


class TestAdminWorkspaceViewSetPermissions(APITestCase):
    def setUp(self):
        self.admin = UserFactory.create(is_staff=True)
        self.normal = UserFactory.create()

    def test_list_by_normal_user_returns_403(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.get(reverse(LIST_URL))
        self.assertEqual(response.status_code, 403)

    def test_list_by_admin_user_returns_200(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(LIST_URL))
        self.assertEqual(response.status_code, 200)

    def test_create_by_normal_user_returns_403(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.post(
            reverse(LIST_URL), data={"name": "Test", "visibility": "PRIVATE"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_delete_by_normal_user_returns_403(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.normal)
        response = self.client.delete(reverse(DETAIL_URL, args=[workspace.pk]))
        self.assertEqual(response.status_code, 403)


class TestAdminWorkspaceViewSetList(APITestCase):
    def setUp(self):
        self.admin = UserFactory.create(is_staff=True)
        self.other_admin = UserFactory.create(is_staff=True)

    def test_public_workspaces_are_visible(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(LIST_URL))
        ids = [r["id"] for r in response.json()["results"]]
        self.assertIn(workspace.pk, ids)

    def test_private_workspace_with_access_is_visible(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PRIVATE)
        UserAccessWorkspaceFactory.create(user=self.admin, workspace=workspace)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(LIST_URL))
        ids = [r["id"] for r in response.json()["results"]]
        self.assertIn(workspace.pk, ids)

    def test_private_workspace_without_access_is_not_visible(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PRIVATE)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(LIST_URL))
        ids = [r["id"] for r in response.json()["results"]]
        self.assertNotIn(workspace.pk, ids)

    def test_private_workspace_owned_by_other_user_is_not_visible(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PRIVATE)
        UserAccessWorkspaceFactory.create(
            user=self.other_admin, workspace=workspace, role=WorkspaceRole.OWNER
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(LIST_URL))
        ids = [r["id"] for r in response.json()["results"]]
        self.assertNotIn(workspace.pk, ids)

    def test_filter_by_name_icontains(self):
        workspace = WorkspaceFactory.create(
            name="My Special Workspace", visibility=VisibilityOptions.PUBLIC
        )
        WorkspaceFactory.create(name="Other", visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse(LIST_URL)}?{urlencode({'name': 'special'})}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, data["count"])
        self.assertEqual(workspace.pk, data["results"][0]["id"])

    def test_filter_by_name_case_insensitive(self):
        workspace = WorkspaceFactory.create(
            name="My Special Workspace", visibility=VisibilityOptions.PUBLIC
        )
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse(LIST_URL)}?{urlencode({'name': 'SPECIAL'})}"
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(1, data["count"])
        self.assertEqual(workspace.pk, data["results"][0]["id"])

    def test_no_duplicate_results_when_user_has_access_to_public_workspace(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        UserAccessWorkspaceFactory.create(user=self.admin, workspace=workspace)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(LIST_URL))
        ids = [r["id"] for r in response.json()["results"]]
        self.assertEqual(ids.count(workspace.pk), 1)


class TestAdminWorkspaceViewSetCreate(APITestCase):
    def setUp(self):
        self.admin = UserFactory.create(is_staff=True)

    def test_create_workspace_returns_201(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse(LIST_URL),
            data={"name": "New Workspace", "visibility": "PRIVATE"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["name"], "New Workspace")

    def test_create_workspace_creates_owner_access(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse(LIST_URL),
            data={"name": "New Workspace", "visibility": "PRIVATE"},
            format="json",
        )
        workspace_id = response.json()["id"]
        access = UserAccessWorkspace.objects.filter(
            user=self.admin,
            workspace_id=workspace_id,
            role=WorkspaceRole.OWNER,
        )
        self.assertTrue(access.exists())

    def test_created_workspace_appears_in_list(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            reverse(LIST_URL),
            data={"name": "Listed Workspace", "visibility": "PRIVATE"},
            format="json",
        )
        response = self.client.get(reverse(LIST_URL))
        names = [r["name"] for r in response.json()["results"]]
        self.assertIn("Listed Workspace", names)


class TestAdminWorkspaceViewSetRetrieve(APITestCase):
    def setUp(self):
        self.admin = UserFactory.create(is_staff=True)

    def test_retrieve_accessible_workspace_returns_200(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(DETAIL_URL, args=[workspace.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], workspace.pk)

    def test_retrieve_inaccessible_private_workspace_returns_404(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PRIVATE)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse(DETAIL_URL, args=[workspace.pk]))
        self.assertEqual(response.status_code, 404)


class TestAdminWorkspaceViewSetUpdate(APITestCase):
    def setUp(self):
        self.admin = UserFactory.create(is_staff=True)

    def test_put_accessible_workspace_returns_200(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(
            reverse(DETAIL_URL, args=[workspace.pk]),
            data={"name": "Renamed", "visibility": "PUBLIC"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Renamed")

    def test_patch_accessible_workspace_returns_200(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            reverse(DETAIL_URL, args=[workspace.pk]),
            data={"name": "Patched Name"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Patched Name")

    def test_put_inaccessible_private_workspace_returns_404(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PRIVATE)
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(
            reverse(DETAIL_URL, args=[workspace.pk]),
            data={"name": "Renamed", "visibility": "PRIVATE"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)


class TestAdminWorkspaceViewSetDelete(APITestCase):
    def setUp(self):
        self.admin = UserFactory.create(is_staff=True)

    def test_delete_accessible_workspace_returns_204(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PUBLIC)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse(DETAIL_URL, args=[workspace.pk]))
        self.assertEqual(response.status_code, 204)

    def test_delete_inaccessible_private_workspace_returns_404(self):
        workspace = WorkspaceFactory.create(visibility=VisibilityOptions.PRIVATE)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse(DETAIL_URL, args=[workspace.pk]))
        self.assertEqual(response.status_code, 404)
