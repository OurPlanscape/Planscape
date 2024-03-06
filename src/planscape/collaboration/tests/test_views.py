import json
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from unittest import mock
from collaboration.models import UserObjectRole, Role
from collaboration.tests.helpers import create_collaborator_record
from planning.models import PlanningArea


class CreateSharedLinkTest(APITransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create(username="testuser1")
        self.user1.set_password("12345")
        self.user1.save()
        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
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


class GetInvitationsTest(APITransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create(username="testuser1")
        self.user1.set_password("12345")
        self.user1.save()
        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
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


class UpdateCollaboratorRoleTest(APITransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create(
            username="testuser1", email="owner@example.text"
        )
        self.owner.set_password("12345")
        self.owner.save()

        self.collab_user = User.objects.create(
            username="someotheruser", email="acollaborator@example.text"
        )
        self.collab_user.set_password("12345")
        self.collab_user.save()

        self.invitee = User.objects.create(
            username="testuser2", email="iamatestuser@example.text"
        )
        self.invitee.set_password("12345")
        self.invitee.save()

        self.planningarea = PlanningArea.objects.create(
            user=self.owner, region_name="foo"
        )

        self.user_object_role = create_collaborator_record(
            self.owner, self.collab_user, self.planningarea, Role.COLLABORATOR
        )
        self.user_object_role = create_collaborator_record(
            self.owner, self.invitee, self.planningarea, Role.VIEWER
        )

    def test_update_role_from_viewer_to_collaborator(self):
        self.client.force_authenticate(self.owner)
        payload = {"role": "Collaborator"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "target_entity": "planningarea",
                    "object_pk": self.planningarea.pk,
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
                    "target_entity": "planningarea",
                    "object_pk": self.planningarea.pk,
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
                    "target_entity": "planningarea",
                    "object_pk": self.planningarea.pk,
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
                    "target_entity": "planningarea",
                    "object_pk": self.planningarea.pk,
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
                    "target_entity": "planningarea",
                    "object_pk": self.planningarea.pk,
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 403)


    def test_nonexistent_related_object(self):
        self.client.force_authenticate(self.invitee)
        payload = {"role": "Collaborator"}
        response = self.client.patch(
            reverse(
                "collaboration:update_invitation",
                kwargs={
                    "target_entity": "planningarea",
                    "object_pk": 9999,
                    "invitation_id": self.user_object_role.id,
                },
            ),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        
