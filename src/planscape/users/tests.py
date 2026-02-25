import json
import re

from allauth.account.models import EmailAddress
from collaboration.models import Permissions, Role
from datetime import timedelta
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
from rest_framework.test import APITestCase

from planscape.tests.factories import UserFactory


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
