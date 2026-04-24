import json
import re
from datetime import timedelta
from unittest.mock import patch

from allauth.account.models import EmailAddress
from collaboration.models import Permissions, Role
from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from impacts.tests.factories import TreatmentPlanFactory
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from planscape.tests.factories import UserFactory
from rest_framework.test import APITestCase
from users.models import UserProfile


class CreateUserTest(APITestCase):
    def test_create_user_username_is_email(self):
        payload = json.dumps(
            {
                "email": "testuser@test.com",
                "password1": "ComplexPassword123",
                "password2": "ComplexPassword123",
                "first_name": "FirstName",
                "last_name": "LastName",
            }
        )
        response = self.client.post(
            reverse("rest_register"), payload, content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)

        user = User.objects.get(email="testuser@test.com")
        self.assertEqual(user.get_username(), "testuser@test.com")

        # Verification email is sent.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject, "[Planscape] Please Confirm Your Email Address"
        )
        self.assertIn("Team Planscape", mail.outbox[0].body)


class DeactivateUserTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create(email="testuser@test.com")
        self.user.set_password("12345")
        self.user.save()

    def test_not_authenticated(self):
        payload = json.dumps({"email": "testuser@test.com"})
        response = self.client.post(
            reverse("users:deactivate"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_missing_email(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("users:deactivate"), json.dumps({}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_missing_password(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"email": "testuser@test.com"})
        response = self.client.post(
            reverse("users:deactivate"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_different_user(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"email": "diffuser@test.com"})
        response = self.client.post(
            reverse("users:deactivate"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_correct_user(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"email": "testuser@test.com", "password": "12345"})
        response = self.client.post(
            reverse("users:deactivate"),
            payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.get(pk=self.user.pk).is_active)


class IsVerifiedUserTest(APITestCase):
    def setUp(self):
        payload = json.dumps(
            {
                "email": "testuser@test.com",
                "password1": "ComplexPassword123",
                "password2": "ComplexPassword123",
                "first_name": "FirstName",
                "last_name": "LastName",
            }
        )
        self.client.post(
            reverse("rest_register"), payload, content_type="application/json"
        )
        self.user = User.objects.filter(email="testuser@test.com").get()

    def test_not_logged_in(self):
        response = self.client.get(reverse("users:is_verified_user"))
        self.assertEqual(response.status_code, 400)

    def test_not_verified(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("users:is_verified_user"))
        self.assertEqual(response.status_code, 400)

    def test_verified(self):
        self.client.force_authenticate(self.user)
        email = EmailAddress.objects.filter(email="testuser@test.com").get()
        email.verified = True
        email.save()

        response = self.client.get(reverse("users:is_verified_user"))
        self.assertEqual(response.status_code, 200)


class PasswordResetTest(TestCase):
    def setUp(self):
        self.client.post(
            reverse("rest_register"),
            {
                "email": "testuser@test.com",
                "password1": "ComplexPassword123",
                "password2": "ComplexPassword123",
                "first_name": "FirstName",
                "last_name": "LastName",
            },
        )
        self.user = User.objects.filter(email="testuser@test.com").get()

    def test_reset_link(self):
        self.client.post(
            reverse("rest_password_reset"),
            {"email": "testuser@test.com"},
            HTTP_ORIGIN="http://localhost:4200",
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "[Planscape] Password Reset Email")
        self.assertIn("http://localhost:4200/reset", mail.outbox[0].body)
        self.assertIn("Team Planscape", mail.outbox[0].body)

    def test_reset_link_for_unknown_user(self):
        self.client.post(
            reverse("rest_password_reset"),
            {"email": "totallymadeup@test.test"},
            HTTP_ORIGIN="http://localhost:4200",
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "[Planscape] Password Reset Request")
        self.assertIn("http://localhost:4200/signup", mail.outbox[0].body)
        self.assertIn("no existing Planscape account", mail.outbox[0].body)
        self.assertIn("Team Planscape", mail.outbox[0].body)

    # Ensure that we ignore API requests to send malformed emails
    def test_reset_link_for_invalid_email(self):
        self.client.post(
            reverse("rest_password_reset"),
            {"email": "invalid;\r\n\r\n@format;;.\r\n"},
            HTTP_ORIGIN="http://localhost:4200",
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_confirmation_email(self):
        # POST request to get reset password link.
        payload = json.dumps({"email": "testuser@test.com"})
        self.client.post(
            reverse("rest_password_reset"), payload, content_type="application/json"
        )

        # Check that reset email was sent and extract reset token.
        self.assertEqual(len(mail.outbox), 1)
        token_search = re.search("/reset/([a-z0-9]+)/([a-z0-9-]+)", mail.outbox[0].body)
        self.assertIsNotNone(token_search)
        uid = token_search.group(1)
        token = token_search.group(2)

        # Verifying the token is valid.
        response = self.client.get(
            reverse(
                "verify_password_reset_token", kwargs={"user_id": uid, "token": token}
            )
        )
        self.assertEqual(response.status_code, 200)

        # POST request to set new password with token.
        response = self.client.post(
            reverse("rest_password_reset_confirm"),
            {
                "new_password1": "ComplexPassword456",
                "new_password2": "ComplexPassword456",
                "uid": uid,
                "token": token,
            },
        )
        self.assertEqual(response.status_code, 200)

        # Check that password reset confirmation email was received.
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[1].subject, "[Planscape] Password Reset")
        self.assertIn("Team Planscape", mail.outbox[1].body)

    def test_verify_with_invalid_password_reset_token(self):
        # Invalid uid and token
        response = self.client.get(
            reverse(
                "verify_password_reset_token",
                kwargs={"user_id": "1b", "token": "abcdefg"},
            )
        )
        self.assertEqual(response.status_code, 400)

        # POST request to get reset password link.
        self.client.post(reverse("rest_password_reset"), {"email": "testuser@test.com"})

        # Check that reset email was sent and extract reset token.
        self.assertEqual(len(mail.outbox), 1)
        token_search = re.search("/reset/([a-z0-9]+)/([a-z0-9-]+)", mail.outbox[0].body)
        self.assertIsNotNone(token_search)
        uid = token_search.group(1)
        token = token_search.group(2)

        # Valid uid, but invalid token.
        response = self.client.get(
            reverse(
                "verify_password_reset_token",
                kwargs={"user_id": uid, "token": "abcdefg"},
            )
        )
        self.assertEqual(response.status_code, 400)

        # Valid token, but not the right uid.
        response = self.client.get(
            reverse(
                "verify_password_reset_token", kwargs={"user_id": "1b", "token": token}
            )
        )
        self.assertEqual(response.status_code, 400)


class PasswordChangeTest(TestCase):
    def setUp(self):
        self.client.post(
            reverse("rest_register"),
            {
                "email": "testuser@test.com",
                "password1": "ComplexPassword123",
                "password2": "ComplexPassword123",
                "first_name": "FirstName",
                "last_name": "LastName",
            },
        )
        self.user = User.objects.filter(email="testuser@test.com").get()
        # Mark the user as verified.
        email = EmailAddress.objects.filter(email="testuser@test.com").get()
        email.verified = True
        email.save()

    def test_password_change_confirmation_email(self):
        # Must do a full login.
        # `self.client.force_login(self.user)` does not work.
        response = self.client.post(
            reverse("rest_login"),
            {"email": "testuser@test.com", "password": "ComplexPassword123"},
        )
        self.assertEqual(response.status_code, 200)

        # POST request to change password.
        response = self.client.post(
            reverse("rest_password_change"),
            {
                "old_password": "ComplexPassword123",
                "new_password1": "ComplexPassword456",
                "new_password2": "ComplexPassword456",
            },
        )
        self.assertEqual(response.status_code, 200)

        # Check that password reset confirmation email was received.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "[Planscape] Password Changed")
        self.assertIn("Team Planscape", mail.outbox[0].body)


# Override the setting so that there is no cooldown time between verification
# emails.
@override_settings(ACCOUNT_EMAIL_CONFIRMATION_COOLDOWN=0)
class LoginTest(TestCase):
    def setUp(self):
        self.client.post(
            reverse("rest_register"),
            {
                "email": "testuser@test.com",
                "password1": "ComplexPassword123",
                "password2": "ComplexPassword123",
                "first_name": "FirstName",
                "last_name": "LastName",
            },
        )
        self.user = User.objects.filter(email="testuser@test.com").get()
        # Empty the outbox before trying to login in tests below.
        mail.outbox = []

    def test_login_unverified_user(self):
        response = self.client.post(
            reverse("rest_login"),
            {"email": "testuser@test.com", "password": "ComplexPassword123"},
        )
        self.assertEqual(response.status_code, 400)

    def test_login_verified_user(self):
        email = EmailAddress.objects.filter(email="testuser@test.com").get()
        email.verified = True
        email.save()

        response = self.client.post(
            reverse("rest_login"),
            {"email": "testuser@test.com", "password": "ComplexPassword123"},
        )
        self.assertEqual(response.status_code, 200)

    def test_login_incorrect_password(self):
        response = self.client.post(
            reverse("rest_login"),
            {"email": "testuser@test.com", "password": "IncorrectPassword"},
        )
        self.assertEqual(response.status_code, 400)
        # No email is sent for user to verify email because login failed.
        self.assertEqual(len(mail.outbox), 0)

    def test_login_email_uppercase(self):
        email = EmailAddress.objects.filter(email="testuser@test.com").get()
        email.verified = True
        email.save()

        response = self.client.post(
            reverse("rest_login"),
            {"email": "TESTUSER@TEST.COM", "password": "ComplexPassword123"},
        )
        self.assertEqual(response.status_code, 200)

    def test_login_email_mixed_case(self):
        email = EmailAddress.objects.filter(email="testuser@test.com").get()
        email.verified = True
        email.save()

        response = self.client.post(
            reverse("rest_login"),
            {"email": "TestUser@Test.Com", "password": "ComplexPassword123"},
        )
        self.assertEqual(response.status_code, 200)


class DestroyUserTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.url = reverse("users:e2e-destroy")

    @override_settings(ALLOW_DELETE_USERS=False)
    def test_returns_404_when_disabled(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 404)

    @override_settings(ALLOW_DELETE_USERS=True)
    def test_returns_401_when_unauthenticated(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 401)

    @override_settings(ALLOW_DELETE_USERS=True)
    def test_deletes_user_when_enabled(self):
        user_pk = self.user.pk
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=user_pk).exists())


class LoginWithoutEmailVerificationTest(TestCase):
    def setUp(self):
        self.email = "unverified@test.com"
        self.password = "ComplexPassword123"

    @override_settings(
        ACCOUNT_EMAIL_VERIFICATION="mandatory",
        ACCOUNT_EMAIL_CONFIRMATION_COOLDOWN=0,
    )
    def test_unverified_user_cannot_login_when_verification_mandatory(self):
        self.client.post(
            reverse("rest_register"),
            {
                "email": self.email,
                "password1": self.password,
                "password2": self.password,
                "first_name": "Test",
                "last_name": "User",
            },
        )
        response = self.client.post(
            reverse("rest_login"),
            {"email": self.email, "password": self.password},
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(ACCOUNT_EMAIL_VERIFICATION="none")
    def test_unverified_user_can_login_when_verification_none(self):
        self.client.post(
            reverse("rest_register"),
            {
                "email": self.email,
                "password1": self.password,
                "password2": self.password,
                "first_name": "Test",
                "last_name": "User",
            },
        )
        response = self.client.post(
            reverse("rest_login"),
            {"email": self.email, "password": self.password},
        )
        self.assertEqual(response.status_code, 200)


class ValidateMartinRequestTestCase(APITestCase):
    def setUp(self):
        Permissions.objects.get_or_create(role=Role.OWNER, permission="view_scenario")
        Permissions.objects.get_or_create(
            role=Role.COLLABORATOR, permission="view_scenario"
        )
        Permissions.objects.get_or_create(role=Role.VIEWER, permission="view_scenario")
        self.owner = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.viewer = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(
            user=self.owner,
            owners=[self.owner],
            collaborators=[self.collaborator],
            viewers=[self.viewer],
        )
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area, user=self.owner
        )
        self.project_area = ProjectAreaFactory.create(scenario=self.scenario)
        self.treatment_plan = TreatmentPlanFactory.create(scenario=self.scenario)
        self.url = reverse("users:validate-martin-request")

    def test_user_has_permission__no_queryparams(self):
        some_user = UserFactory.create()
        self.client.force_authenticate(some_user)
        response = self.client.get(
            self.url, headers={"X_ORIGINAL_URI": "/tiles/planning_area_by_id/10/1/2"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_owner_has_permission__scenario(self):
        self.client.force_authenticate(self.owner)
        martins_path = (
            f"/tiles/planning_area_by_id/martin?scenario_id={self.scenario.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_owner_has_permission__project_area(self):
        self.client.force_authenticate(self.owner)
        martins_path = (
            f"/tiles/planning_area_by_id/martin?project_area_id={self.project_area.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_owner_has_permission__tx_plan(self):
        self.client.force_authenticate(self.owner)
        martins_path = f"/tiles/planning_area_by_id/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_collaborator_has_permission__scenario(self):
        self.client.force_authenticate(self.collaborator)
        martins_path = (
            f"/tiles/planning_area_by_id/martin?scenario_id={self.scenario.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_collaborator_has_permission__project_area(self):
        self.client.force_authenticate(self.collaborator)
        martins_path = (
            f"/tiles/planning_area_by_id/martin?project_area_id={self.project_area.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_collaborator_has_permission__tx_plan(self):
        self.client.force_authenticate(self.collaborator)
        martins_path = f"/tiles/planning_area_by_id/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_viewer_has_permission__scenario(self):
        self.client.force_authenticate(self.viewer)
        martins_path = (
            f"/tiles/planning_area_by_id/martin?scenario_id={self.scenario.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_viewer_has_permission__project_area(self):
        self.client.force_authenticate(self.viewer)
        martins_path = f"/tiles/project_area_aggregate/martin?project_area_id={self.project_area.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_viewer_has_permission__tx_plan(self):
        self.client.force_authenticate(self.viewer)
        martins_path = f"/tiles/project_area_aggregate/martin?treatment_plan_id={self.treatment_plan.pk}"
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_user_has_no_permission__scenario(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = (
            f"/tiles/project_areas_by_scenario?scenario_id={self.scenario.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 403)

    def test_user_has_no_permission__project_area(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = (
            f"/tiles/project_areas_by_scenario?project_area_id={self.project_area.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 403)

    def test_user_has_no_permission__tx_plan(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = (
            f"/tiles/stands_by_tx_plan?treatment_plan_id={self.treatment_plan.pk}"
        )
        response = self.client.get(
            self.url,
            headers={"X_ORIGINAL_URI": martins_path},
        )

        self.assertEqual(response.status_code, 403)

    # stands_by_planning_area expects planning_area_id (required) and optional stand_size
    def test_owner_has_permission__stands_by_planning_area(self):
        self.client.force_authenticate(self.owner)
        martins_path = (
            f"/tiles/stands_by_planning_area?"
            f"planning_area_id={self.planning_area.pk}&stand_size=SMALL"
        )
        response = self.client.get(self.url, headers={"X_ORIGINAL_URI": martins_path})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"valid": True})

    def test_user_has_no_permission__stands_by_planning_area(self):
        another_user = UserFactory.create()
        self.client.force_authenticate(another_user)
        martins_path = (
            f"/tiles/stands_by_planning_area?"
            f"planning_area_id={self.planning_area.pk}&stand_size=SMALL"
        )
        response = self.client.get(self.url, headers={"X_ORIGINAL_URI": martins_path})
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_user(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 400)

    def test_missing_headers(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "X-Original-URI header not found"})


class LastLoginTest(TestCase):
    def setUp(self):
        self.email = "lastlogin@test.com"
        self.password = "ComplexPassword123"
        self.client.post(
            reverse("rest_register"),
            {
                "email": self.email,
                "password1": self.password,
                "password2": self.password,
                "first_name": "FirstName",
                "last_name": "LastName",
            },
        )
        self.user = User.objects.get(email=self.email)
        email = EmailAddress.objects.get(email=self.email)
        email.verified = True
        email.save()

    def test_last_login_is_set_on_login(self):
        self.user.refresh_from_db()
        self.assertIsNone(self.user.last_login)
        resp = self.client.post(
            reverse("rest_login"),
            {"email": self.email, "password": self.password},
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)
        self.assertLess(
            abs(self.user.last_login - timezone.now()), timedelta(minutes=2)
        )

    def test_last_login_updates_on_refresh(self):
        self.client.post(
            reverse("rest_login"),
            {"email": self.email, "password": self.password},
        )
        self.user.refresh_from_db()
        first_login_time = self.user.last_login
        self.assertIsNotNone(first_login_time)
        resp = self.client.post(reverse("token_refresh"), {})
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertGreaterEqual(self.user.last_login, first_login_time)

    @patch("planscape.openpanel.track_openpanel")
    @patch("planscape.openpanel.identify_openpanel")
    def test_returning_user_event_is_tracked_on_login(self, mock_identify, mock_track):
        self.user.date_joined = timezone.now() - timedelta(days=31)
        self.user.last_login = None
        self.user.save(update_fields=["date_joined", "last_login"])

        resp = self.client.post(
            reverse("rest_login"),
            {"email": self.email, "password": self.password},
        )

        self.assertEqual(resp.status_code, 200)
        mock_identify.assert_called_once_with(self.user)
        self.assertEqual(mock_track.call_count, 2)
        mock_track.assert_any_call(
            "users.logged_in",
            properties={"email": self.email},
            user_id=self.user.pk,
        )
        mock_track.assert_any_call(
            "users.returned_after_30d",
            properties={"email": self.email, "count": 1},
            user_id=self.user.pk,
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.last_returning_user_bucket, 1)
        self.assertIsNotNone(self.user.profile.last_returning_user_event_at)


class OpenPanelEventsTest(TestCase):
    @patch("users.allauth_adapter.track_openpanel")
    @patch("users.allauth_adapter.identify_openpanel")
    def test_user_registered_event_is_tracked(self, mock_identify, mock_track):
        from unittest.mock import MagicMock

        from allauth.account.adapter import DefaultAccountAdapter

        from users.allauth_adapter import CustomAllauthAdapter

        user = UserFactory.create()
        adapter = CustomAllauthAdapter()

        with patch.object(DefaultAccountAdapter, "save_user", return_value=user):
            adapter.save_user(request=None, user=user, form=MagicMock())

        mock_track.assert_called_once_with(
            "users.registered",
            properties={"email": user.email},
            user_id=user.pk,
        )

    @patch("planscape.openpanel.track_openpanel")
    def test_user_email_confirmed_event_is_tracked(self, mock_track):
        from allauth.account.signals import email_confirmed

        user = UserFactory.create()
        email_address = EmailAddress.objects.get_or_create(
            user=user, email=user.email, defaults={"verified": False, "primary": True}
        )[0]

        email_confirmed.send(sender=None, request=None, email_address=email_address)

        mock_track.assert_called_once_with(
            "users.email_confirmed",
            properties={"email": user.email},
            user_id=user.pk,
        )


class ReturningUserTrackingTest(TestCase):
    def _make_user(self, date_joined_days_ago, last_login_days_ago=None):
        now = timezone.now()
        user = UserFactory.create()
        user.date_joined = now - timedelta(days=date_joined_days_ago)
        if last_login_days_ago is not None:
            user.last_login = now - timedelta(days=last_login_days_ago)
        else:
            user.last_login = None
        user.save()
        return user

    def test_profile_is_created_for_new_users(self):
        user = UserFactory.create()

        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        self.assertEqual(user.profile.last_returning_user_bucket, 0)
        self.assertIsNone(user.profile.last_returning_user_event_at)

    @patch("planscape.openpanel.track_openpanel")
    def test_fires_on_first_login_after_30_days(self, mock_track):
        user = self._make_user(date_joined_days_ago=31, last_login_days_ago=None)
        from users.backends import track_returning_user

        track_returning_user(user)
        mock_track.assert_called_once_with(
            "users.returned_after_30d",
            properties={"email": user.email, "count": 1},
            user_id=user.pk,
        )
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.last_returning_user_bucket, 1)
        self.assertIsNotNone(user.profile.last_returning_user_event_at)

    @patch("planscape.openpanel.track_openpanel")
    def test_does_not_fire_again_within_same_bucket(self, mock_track):
        user = self._make_user(date_joined_days_ago=40, last_login_days_ago=5)
        user.profile.last_returning_user_bucket = 1
        user.profile.last_returning_user_event_at = timezone.now() - timedelta(days=2)
        user.profile.save(
            update_fields=[
                "last_returning_user_bucket",
                "last_returning_user_event_at",
            ]
        )
        from users.backends import track_returning_user

        track_returning_user(user)
        mock_track.assert_not_called()

    @patch("planscape.openpanel.track_openpanel")
    def test_does_not_fire_within_30_days(self, mock_track):
        user = self._make_user(date_joined_days_ago=20, last_login_days_ago=None)
        from users.backends import track_returning_user

        track_returning_user(user)
        mock_track.assert_not_called()

    @patch("planscape.openpanel.track_openpanel")
    def test_fires_for_next_bucket(self, mock_track):
        user = self._make_user(date_joined_days_ago=61, last_login_days_ago=5)
        user.profile.last_returning_user_bucket = 1
        user.profile.last_returning_user_event_at = timezone.now() - timedelta(days=20)
        user.profile.save(
            update_fields=[
                "last_returning_user_bucket",
                "last_returning_user_event_at",
            ]
        )
        from users.backends import track_returning_user

        track_returning_user(user)
        mock_track.assert_called_once_with(
            "users.returned_after_60d",
            properties={"email": user.email, "count": 2},
            user_id=user.pk,
        )
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.last_returning_user_bucket, 2)
        self.assertIsNotNone(user.profile.last_returning_user_event_at)

    @patch("planscape.openpanel.track_openpanel")
    def test_skipped_buckets_fire_only_for_current_bucket(self, mock_track):
        user = self._make_user(date_joined_days_ago=95, last_login_days_ago=40)
        user.profile.last_returning_user_bucket = 1
        user.profile.last_returning_user_event_at = timezone.now() - timedelta(days=35)
        user.profile.save(
            update_fields=[
                "last_returning_user_bucket",
                "last_returning_user_event_at",
            ]
        )
        from users.backends import track_returning_user

        track_returning_user(user)

        mock_track.assert_called_once_with(
            "users.returned_after_90d",
            properties={"email": user.email, "count": 3},
            user_id=user.pk,
        )
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.last_returning_user_bucket, 3)
