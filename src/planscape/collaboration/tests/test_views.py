import json
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from unittest import mock
from collaboration.models import UserObjectRole, Role
from collaboration.tests.factories import UserObjectRoleFactory
from planning.models import PlanningArea
from planscape.tests.factories import UserFactory


class CreateSharedLinkTest(APITransactionTestCase):
    def setUp(self):
        self.user1 = UserFactory(username="testuser1")
        self.user2 = UserFactory(username="testuser2")
        self.pa1 = PlanningArea.objects.create(user=self.user1, region_name="foo")
        self.pa2 = PlanningArea.objects.create(user=self.user2, region_name="foo")

    @mock.patch(
        "collaboration.services.send_invitation.delay",
        return_value=(True, "all good"),
    )
    def test_create_invite(self, send_invitation):
        data = {
            "target_entity": "planningarea",
            "object_pk": self.pa1.pk,
            "emails": [
                "foo@foo.com",
            ],
            "role": "Viewer",
            "message": "Hi!",
        }
        self.client.force_authenticate(self.user1)
        response = self.client.post(
            reverse("collaboration:create_invite"), data, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertGreater(UserObjectRole.objects.all().count(), 0)

    @mock.patch(
        "collaboration.services.send_invitation.delay",
        return_value=(True, "all good"),
    )
    def test_create_invite_for_non_creator(self, send_invitation):
        data = {
            "target_entity": "planningarea",
            "object_pk": self.pa2.pk,
            "emails": [
                "foo@foo.com",
            ],
            "role": "Viewer",
            "message": "Hi!",
        }
        self.client.force_authenticate(self.user1)
        response = self.client.post(
            reverse("collaboration:create_invite"), data, format="json"
        )
        self.assertEqual(response.status_code, 403)

    @mock.patch(
        "collaboration.services.send_invitation.delay",
        return_value=(True, "all good"),
    )
    def test_create_invite_unauthenticated(self, send_invitation):
        data = {
            "target_entity": "planningarea",
            "object_pk": self.pa1.pk,
            "emails": [
                "foo@foo.com",
            ],
            "role": "Viewer",
            "message": "Hi!",
        }
        response = self.client.post(
            reverse("collaboration:create_invite"), data, format="json"
        )
        self.assertEqual(response.status_code, 401)


class GetInvitationsTest(APITransactionTestCase):
    def setUp(self):
        self.user1 = UserFactory(username="testuser1")
        self.user2 = UserFactory(username="testuser2")
        self.pa1 = PlanningArea.objects.create(user=self.user1, region_name="foo")
        self.pa2 = PlanningArea.objects.create(user=self.user2, region_name="foo")

    def test_returns_all_invites(self):
        self.client.force_authenticate(self.user1)
        response = self.client.get(
            reverse(
                "collaboration:get_invitations",
                kwargs={"target_entity": "planningarea", "object_pk": self.pa1.pk},
            ),
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        assert len(data) == 0

    def test_returns_one_invite_not_you(self):
        UserObjectRole.objects.create(
            collaborator=self.user2, inviter=self.user1, content_object=self.pa1
        )
        self.client.force_authenticate(self.user1)
        response = self.client.get(
            reverse(
                "collaboration:get_invitations",
                kwargs={"target_entity": "planningarea", "object_pk": self.pa1.pk},
            ),
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        assert len(data) == 1

    def test_returns_all_invites_unauthenticated(self):
        response = self.client.get(
            reverse(
                "collaboration:get_invitations",
                kwargs={"target_entity": "planningarea", "object_pk": self.pa1.pk},
            ),
        )
        self.assertEqual(response.status_code, 401)


class UpdateCollaboratorRoleTest(APITransactionTestCase):
    def setUp(self):
        self.owner = UserFactory()
        self.collab_user = UserFactory()
        self.invitee = UserFactory()

        self.planningarea = PlanningArea.objects.create(
            user=self.owner, region_name="foo"
        )

        self.user_object_role = UserObjectRoleFactory(
            inviter=self.owner,
            collaborator=self.invitee,
            email=self.invitee.email,
            role=Role.VIEWER,
            associated_model=self.planningarea,
        )

    def test_update_role_from_viewer_to_collaborator(self):
        self.client.force_authenticate(self.owner)
        payload = {"role": "Collaborator"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        response_obj = json.loads(response.content)
        self.assertEqual(response_obj["role"], "Collaborator")

    def test_update_role_from_viewer_to_viewer(self):
        self.client.force_authenticate(self.owner)
        payload = {"role": "Viewer"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        response_obj = json.loads(response.content)
        self.assertEqual(response_obj["role"], "Viewer")

    def test_update_role_to_nonexistent_role(self):
        self.client.force_authenticate(self.owner)
        payload = {"role": "NonexistentMadeupRole"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertJSONEqual(
            response.content,
            {"role": ['"NonexistentMadeupRole" is not a valid choice.']},
        )

    def test_update_role_as_collaborator(self):
        self.client.force_authenticate(self.collab_user)
        payload = {"role": "Collaborator"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_update_role_as_unprivileged_user(self):
        self.client.force_authenticate(self.invitee)
        payload = {"role": "Collaborator"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_update_role_unauthenticated(self):
        payload = {"role": "Collaborator"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 401)


class DeleteInviteTest(APITransactionTestCase):
    def setUp(self):
        self.owner = UserFactory()
        self.collab_user = UserFactory()
        self.invitee = UserFactory()

        self.planningarea = PlanningArea.objects.create(
            user=self.owner, region_name="foo"
        )
        self.user_object_role_collab = UserObjectRoleFactory(
            inviter=self.owner,
            collaborator=self.collab_user,
            email=self.collab_user.email,
            role=Role.COLLABORATOR,
            associated_model=self.planningarea,
        )

        self.user_object_role_viewer = UserObjectRoleFactory(
            inviter=self.owner,
            collaborator=self.invitee,
            email=self.invitee.email,
            role=Role.VIEWER,
            associated_model=self.planningarea,
        )

    def test_delete_collab_invite_as_owner(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role_collab.id,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 204)

    def test_delete_viewer_invite_as_owner(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role_viewer.id,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 204)

    def test_delete_collab_invite_as_viewer(self):
        self.client.force_authenticate(self.invitee)
        response = self.client.delete(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role_collab.id,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_delete_nonexistent_invite(self):
        self.client.force_authenticate(self.invitee)
        response = self.client.delete(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": 9999999,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_unathenticated(self):
        response = self.client.delete(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "invitation_id": self.user_object_role_collab.id,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 401)
