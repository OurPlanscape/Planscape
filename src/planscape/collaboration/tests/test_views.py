from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITransactionTestCase
from unittest import mock
from collaboration.models import UserObjectRole
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
