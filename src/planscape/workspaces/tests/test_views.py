from unittest.mock import patch

from django.urls import reverse
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory
from rest_framework.test import APITestCase

from workspaces.models import (
    UserAccessWorkspace,
    Workspace,
    WorkspaceKind,
    WorkspaceRole,
)
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
    WorkspaceFactory,
)

LIST_URL = "api:workspaces:workspaces-list"
DETAIL_URL = "api:workspaces:workspaces-detail"
INVITE_URL = "api:workspaces:workspaces-invite"
ACCEPT_INVITE_URL = "api:workspaces:workspaces-accept-invite"
USERS_URL = "api:workspaces:workspaces-users"
MANAGE_USER_URL = "api:workspaces:workspaces-manage-user"
PLANNING_AREAS_URL = "api:workspaces:workspaces-planning-areas"


class CreateWorkspaceTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create(first_name="Han", last_name="Solo")

    def test_create_requires_authentication(self):
        response = self.client.post(
            reverse(LIST_URL), data={"name": "Falcon"}, format="json"
        )
        self.assertIn(response.status_code, (401, 403))

    def test_create_returns_201_and_metadata(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse(LIST_URL), data={"name": "Falcon"}, format="json"
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "Falcon")
        self.assertEqual(data["creator"], "Han Solo")
        self.assertEqual(data["planning_areas_count"], 0)
        self.assertEqual(data["role"], WorkspaceRole.OWNER)
        self.assertIsNotNone(data["created_at"])

    def test_create_makes_the_creator_an_owner(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse(LIST_URL), data={"name": "Falcon"}, format="json"
        )

        workspace = Workspace.objects.get(pk=response.json()["id"])
        self.assertEqual(workspace.kind, WorkspaceKind.PLANNING)
        self.assertEqual(workspace.created_by, self.user)
        self.assertEqual(workspace.creator_name, "Han Solo")
        self.assertTrue(
            UserAccessWorkspace.objects.filter(
                user=self.user, workspace=workspace, role=WorkspaceRole.OWNER
            ).exists()
        )

    def test_create_without_name_returns_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse(LIST_URL), data={}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json()["errors"])

    def test_create_with_duplicate_name_returns_400(self):
        PlanningWorkspaceFactory.create(name="Falcon", created_by=self.user)
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse(LIST_URL), data={"name": "Falcon"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "detail": "Validation error.",
                "errors": {"name": ["A workspace with this name already exists."]},
            },
        )

    def test_create_with_name_taken_by_another_user_returns_201(self):
        PlanningWorkspaceFactory.create(name="Falcon")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse(LIST_URL), data={"name": "Falcon"}, format="json"
        )

        self.assertEqual(response.status_code, 201)

    def test_create_reusing_a_soft_deleted_name_returns_201(self):
        workspace = PlanningWorkspaceFactory.create(name="Falcon", created_by=self.user)
        workspace.delete()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse(LIST_URL), data={"name": "Falcon"}, format="json"
        )

        self.assertEqual(response.status_code, 201)


class ListWorkspaceTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.other = UserFactory.create()

    def test_list_requires_authentication(self):
        response = self.client.get(reverse(LIST_URL))
        self.assertIn(response.status_code, (401, 403))

    def test_list_returns_only_workspaces_the_user_can_access(self):
        PlanningWorkspaceFactory.create(name="Mine", created_by=self.user)
        shared = PlanningWorkspaceFactory.create(name="Shared")
        UserAccessWorkspaceFactory.create(
            user=self.user, workspace=shared, role=WorkspaceRole.VIEWER
        )
        PlanningWorkspaceFactory.create(name="Theirs", created_by=self.other)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse(LIST_URL))

        self.assertEqual(response.status_code, 200)
        names = {row["name"] for row in response.json()["results"]}
        self.assertEqual(names, {"Mine", "Shared"})
        self.assertEqual(response.json()["count"], 2)

    def test_list_excludes_data_catalog_workspaces(self):
        catalog = WorkspaceFactory.create(name="Default")
        UserAccessWorkspaceFactory.create(
            user=self.user, workspace=catalog, role=WorkspaceRole.COLLABORATOR
        )
        PlanningWorkspaceFactory.create(name="Mine", created_by=self.user)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse(LIST_URL))

        names = {row["name"] for row in response.json()["results"]}
        self.assertEqual(names, {"Mine"})

    def test_list_excludes_soft_deleted_workspaces(self):
        PlanningWorkspaceFactory.create(name="Alive", created_by=self.user)
        PlanningWorkspaceFactory.create(name="Gone", created_by=self.user).delete()

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse(LIST_URL))

        names = {row["name"] for row in response.json()["results"]}
        self.assertEqual(names, {"Alive"})

    def test_list_counts_planning_areas(self):
        workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        PlanningAreaFactory.create_batch(2, user=self.user, workspace=workspace)
        PlanningAreaFactory.create(user=self.user, workspace=workspace).delete()
        PlanningAreaFactory.create(user=self.user)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse(LIST_URL))

        row = response.json()["results"][0]
        self.assertEqual(row["planning_areas_count"], 2)

    def test_search_filters_by_name(self):
        PlanningWorkspaceFactory.create(name="Wildfire North", created_by=self.user)
        PlanningWorkspaceFactory.create(name="Coastal", created_by=self.user)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse(LIST_URL), {"search": "wildfire"})

        names = [row["name"] for row in response.json()["results"]]
        self.assertEqual(names, ["Wildfire North"])


class RetrieveWorkspaceTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.other = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(
            name="Falcon", created_by=self.user
        )

    def test_retrieve_by_owner_returns_200(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Falcon")

    def test_retrieve_by_stranger_returns_404(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.get(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 404)

    def test_creator_name_survives_the_creator_leaving(self):
        UserAccessWorkspace.objects.filter(workspace=self.workspace).delete()
        UserAccessWorkspaceFactory.create(
            user=self.other, workspace=self.workspace, role=WorkspaceRole.OWNER
        )

        self.client.force_authenticate(user=self.other)
        response = self.client.get(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["creator"], self.user.get_full_name())


class UpdateWorkspaceTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(
            name="Falcon", created_by=self.user
        )
        UserAccessWorkspaceFactory.create(
            user=self.collaborator,
            workspace=self.workspace,
            role=WorkspaceRole.COLLABORATOR,
        )

    def test_owner_can_rename(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk}),
            data={"name": "Millennium"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Millennium")
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.name, "Millennium")

    def test_collaborator_cannot_rename(self):
        self.client.force_authenticate(user=self.collaborator)
        response = self.client.patch(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk}),
            data={"name": "Millennium"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_rename_to_taken_name_returns_400(self):
        PlanningWorkspaceFactory.create(name="Millennium", created_by=self.user)
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk}),
            data={"name": "Millennium"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "detail": "Validation error.",
                "errors": {"name": ["A workspace with this name already exists."]},
            },
        )

    def test_rename_to_same_name_returns_200(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk}),
            data={"name": "Falcon"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)


class DeleteWorkspaceTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.viewer = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )

    def test_owner_can_delete(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Workspace.objects.filter(pk=self.workspace.pk).exists())
        self.assertTrue(Workspace.dead_or_alive.filter(pk=self.workspace.pk).exists())

    def test_viewer_cannot_delete(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.delete(
            reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_keeps_planning_areas_reachable(self):
        planning_area = PlanningAreaFactory.create(
            user=self.user, workspace=self.workspace
        )
        self.client.force_authenticate(user=self.user)
        self.client.delete(reverse(DETAIL_URL, kwargs={"pk": self.workspace.pk}))

        planning_area.refresh_from_db()
        self.assertIsNone(planning_area.workspace)
        self.assertIsNone(planning_area.deleted_at)


class PlanningAreaWorkspaceTest(APITestCase):
    """
    Planning areas must work with and without a workspace, and the unscoped
    planning area endpoints must keep returning all of them either way.
    """

    def setUp(self):
        self.user = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        self.client.force_authenticate(user=self.user)

    def _create(self, payload):
        return self.client.post(
            reverse("api:planning:planningareas-list"),
            data=payload,
            format="json",
        )

    @property
    def geometry(self):
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [-120.14, 39.05],
                                [-120.14, 39.15],
                                [-120.04, 39.15],
                                [-120.04, 39.05],
                                [-120.14, 39.05],
                            ]
                        ],
                    },
                }
            ],
        }

    def test_create_without_workspace(self):
        response = self._create({"name": "No Workspace", "geometry": self.geometry})

        self.assertEqual(response.status_code, 201, response.json())
        self.assertIsNone(response.json()["workspace"])

    def test_create_with_workspace(self):
        response = self._create(
            {
                "name": "In Workspace",
                "geometry": self.geometry,
                "workspace": self.workspace.pk,
            }
        )

        self.assertEqual(response.status_code, 201, response.json())
        self.assertEqual(response.json()["workspace"], self.workspace.pk)

    def test_create_in_a_workspace_without_access_returns_400(self):
        stranger_workspace = PlanningWorkspaceFactory.create()

        response = self._create(
            {
                "name": "Nope",
                "geometry": self.geometry,
                "workspace": stranger_workspace.pk,
            }
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace", response.json()["errors"])

    def test_list_returns_planning_areas_with_and_without_workspace(self):
        PlanningAreaFactory.create(user=self.user, workspace=self.workspace)
        PlanningAreaFactory.create(user=self.user, workspace=None)

        response = self.client.get(reverse("api:planning:planningareas-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)

    def test_list_can_be_filtered_by_workspace(self):
        inside = PlanningAreaFactory.create(user=self.user, workspace=self.workspace)
        PlanningAreaFactory.create(user=self.user, workspace=None)

        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {"workspace": self.workspace.pk},
        )

        ids = [row["id"] for row in response.json()["results"]]
        self.assertEqual(ids, [inside.pk])

    def test_list_can_be_filtered_to_planning_areas_without_workspace(self):
        PlanningAreaFactory.create(user=self.user, workspace=self.workspace)
        loose = PlanningAreaFactory.create(user=self.user, workspace=None)

        response = self.client.get(
            reverse("api:planning:planningareas-list"),
            {"without_workspace": "true"},
        )

        ids = [row["id"] for row in response.json()["results"]]
        self.assertEqual(ids, [loose.pk])


class InviteWorkspaceMemberTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.collaborator,
            workspace=self.workspace,
            role=WorkspaceRole.COLLABORATOR,
        )

    def _invite(self, **payload):
        return self.client.post(
            reverse(INVITE_URL, kwargs={"pk": self.workspace.pk}),
            data={
                "email": "invitee@example.com",
                "role": WorkspaceRole.VIEWER,
                **payload,
            },
            format="json",
        )

    def test_invite_requires_authentication(self):
        response = self._invite()
        self.assertIn(response.status_code, (401, 403))

    @patch("workspaces.services.send_workspace_invitation.delay")
    def test_owner_can_invite(self, send_invitation):
        self.client.force_authenticate(user=self.owner)
        response = self._invite()

        self.assertEqual(response.status_code, 201, response.json())
        access = UserAccessWorkspace.objects.get(
            workspace=self.workspace, email="invitee@example.com"
        )
        self.assertIsNone(access.user)
        self.assertEqual(access.role, WorkspaceRole.VIEWER)
        self.assertEqual(access.invited_by, self.owner)
        send_invitation.assert_called_once()

    @patch("workspaces.services.send_workspace_invitation.delay")
    def test_collaborator_cannot_invite(self, send_invitation):
        self.client.force_authenticate(user=self.collaborator)
        response = self._invite()

        self.assertEqual(response.status_code, 403)
        send_invitation.assert_not_called()

    @patch("workspaces.services.send_workspace_invitation.delay")
    def test_inviting_an_existing_member_returns_400(self, send_invitation):
        self.client.force_authenticate(user=self.owner)
        response = self._invite(email=self.collaborator.email)

        self.assertEqual(response.status_code, 400)
        send_invitation.assert_not_called()

    @patch("workspaces.services.send_workspace_invitation.delay")
    def test_re_inviting_updates_the_pending_role(self, send_invitation):
        self.client.force_authenticate(user=self.owner)
        self._invite(role=WorkspaceRole.VIEWER)
        response = self._invite(role=WorkspaceRole.COLLABORATOR)

        self.assertEqual(response.status_code, 201, response.json())
        self.assertEqual(
            UserAccessWorkspace.objects.filter(
                workspace=self.workspace, email="invitee@example.com"
            ).count(),
            1,
        )
        access = UserAccessWorkspace.objects.get(
            workspace=self.workspace, email="invitee@example.com"
        )
        self.assertEqual(access.role, WorkspaceRole.COLLABORATOR)

    def test_inviting_as_owner_role_is_rejected(self):
        self.client.force_authenticate(user=self.owner)
        response = self._invite(role=WorkspaceRole.OWNER)

        self.assertEqual(response.status_code, 400)


class AcceptWorkspaceInviteTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.invitee = UserFactory.create(email="invitee@example.com")
        self.stranger = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        self.pending = UserAccessWorkspace.objects.create(
            workspace=self.workspace,
            email="invitee@example.com",
            role=WorkspaceRole.VIEWER,
            invited_by=self.owner,
        )

    def _accept(self):
        return self.client.post(
            reverse(ACCEPT_INVITE_URL, kwargs={"pk": self.workspace.pk})
        )

    def test_accept_requires_authentication(self):
        response = self._accept()
        self.assertIn(response.status_code, (401, 403))

    def test_invitee_can_accept(self):
        self.client.force_authenticate(user=self.invitee)
        response = self._accept()

        self.assertEqual(response.status_code, 200, response.json())
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.user, self.invitee)
        self.assertEqual(response.json()["status"], "ACTIVE")

    def test_non_invited_user_gets_404(self):
        self.client.force_authenticate(user=self.stranger)
        response = self._accept()

        self.assertEqual(response.status_code, 404)

    def test_accepting_twice_returns_404_the_second_time(self):
        self.client.force_authenticate(user=self.invitee)
        self._accept()
        response = self._accept()

        self.assertEqual(response.status_code, 404)


class ListWorkspaceUsersTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.viewer = UserFactory.create()
        self.stranger = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )
        UserAccessWorkspace.objects.create(
            workspace=self.workspace,
            email="pending@example.com",
            role=WorkspaceRole.VIEWER,
            invited_by=self.owner,
        )

    def test_member_can_list_users(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(reverse(USERS_URL, kwargs={"pk": self.workspace.pk}))

        self.assertEqual(response.status_code, 200)
        rows = {row["email"]: row["status"] for row in response.json()}
        self.assertEqual(
            rows,
            {
                self.owner.email: "ACTIVE",
                self.viewer.email: "ACTIVE",
                "pending@example.com": "PENDING",
            },
        )

    def test_stranger_gets_404(self):
        self.client.force_authenticate(user=self.stranger)
        response = self.client.get(reverse(USERS_URL, kwargs={"pk": self.workspace.pk}))

        self.assertEqual(response.status_code, 404)


class UpdateWorkspaceMemberTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.member = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.member,
            workspace=self.workspace,
            role=WorkspaceRole.COLLABORATOR,
        )

    def _patch(self, user_id, **payload):
        return self.client.patch(
            reverse(
                MANAGE_USER_URL, kwargs={"pk": self.workspace.pk, "user_id": user_id}
            ),
            data={"role": WorkspaceRole.VIEWER, **payload},
            format="json",
        )

    def test_owner_can_change_a_members_role(self):
        self.client.force_authenticate(user=self.owner)
        response = self._patch(self.member.pk)

        self.assertEqual(response.status_code, 200, response.json())
        access = UserAccessWorkspace.objects.get(
            workspace=self.workspace, user=self.member
        )
        self.assertEqual(access.role, WorkspaceRole.VIEWER)

    def test_non_owner_cannot_change_roles(self):
        self.client.force_authenticate(user=self.member)
        response = self._patch(self.owner.pk)

        self.assertEqual(response.status_code, 403)

    def test_cannot_change_the_creators_role(self):
        self.client.force_authenticate(user=self.owner)
        response = self._patch(self.owner.pk)

        self.assertEqual(response.status_code, 400)

    def test_cannot_promote_a_member_to_owner(self):
        self.client.force_authenticate(user=self.owner)
        response = self._patch(self.member.pk, role=WorkspaceRole.OWNER)

        self.assertEqual(response.status_code, 400)
        access = UserAccessWorkspace.objects.get(
            workspace=self.workspace, user=self.member
        )
        self.assertEqual(access.role, WorkspaceRole.COLLABORATOR)


class RemoveWorkspaceMemberTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.member = UserFactory.create()
        self.other_member = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.member,
            workspace=self.workspace,
            role=WorkspaceRole.COLLABORATOR,
        )
        UserAccessWorkspaceFactory.create(
            user=self.other_member,
            workspace=self.workspace,
            role=WorkspaceRole.VIEWER,
        )

    def _delete(self, user_id):
        return self.client.delete(
            reverse(
                MANAGE_USER_URL, kwargs={"pk": self.workspace.pk, "user_id": user_id}
            )
        )

    def test_owner_can_remove_a_member(self):
        self.client.force_authenticate(user=self.owner)
        response = self._delete(self.member.pk)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            UserAccessWorkspace.objects.filter(
                workspace=self.workspace, user=self.member
            ).exists()
        )

    def test_member_cannot_remove_another_member(self):
        self.client.force_authenticate(user=self.member)
        response = self._delete(self.other_member.pk)

        self.assertEqual(response.status_code, 403)

    def test_member_can_leave(self):
        self.client.force_authenticate(user=self.member)
        response = self._delete(self.member.pk)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            UserAccessWorkspace.objects.filter(
                workspace=self.workspace, user=self.member
            ).exists()
        )

    def test_creator_cannot_leave(self):
        self.client.force_authenticate(user=self.owner)
        response = self._delete(self.owner.pk)

        self.assertEqual(response.status_code, 400)
        self.assertTrue(
            UserAccessWorkspace.objects.filter(
                workspace=self.workspace, user=self.owner
            ).exists()
        )


class WorkspacePlanningAreasListTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.viewer = UserFactory.create()
        self.stranger = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )
        # Created by the owner, not the viewer - proves this endpoint gates on
        # workspace role rather than per-planning-area collaboration.
        self.inside = PlanningAreaFactory.create(
            user=self.owner, workspace=self.workspace
        )
        PlanningAreaFactory.create(user=self.owner, workspace=self.workspace).delete()
        PlanningAreaFactory.create(user=self.owner, workspace=None)

    def test_member_sees_all_workspace_planning_areas(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(
            reverse(PLANNING_AREAS_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [self.inside.pk])

    def test_stranger_gets_404(self):
        self.client.force_authenticate(user=self.stranger)
        response = self.client.get(
            reverse(PLANNING_AREAS_URL, kwargs={"pk": self.workspace.pk})
        )

        self.assertEqual(response.status_code, 404)
