import re
import time

from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.core import mail
from django.test import TransactionTestCase, override_settings
from django.urls import reverse


class CreateUserTest(TransactionTestCase):
    def test_create_user_username_is_email(self):
        response = self.client.post(
            reverse("rest_register"),
            {
                "email": "testuser@test.com",
                "password1": "ComplexPassword123",
                "password2": "ComplexPassword123",
                "first_name": "FirstName",
                "last_name": "LastName",
            },
        )
        self.assertEquals(response.status_code, 201)

        user = User.objects.get(email="testuser@test.com")
        self.assertEquals(user.get_username(), "testuser@test.com")

        # Verification email is sent.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject, "[Planscape] Please Confirm Your E-mail Address"
        )
        self.assertIn("Team Planscape", mail.outbox[0].body)


class DeleteUserTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(email="testuser@test.com")
        self.user.set_password("12345")
        self.user.save()

    def test_missing_user(self):
        response = self.client.post(
            reverse("users:delete"),
            {"email": "testuser@test.com"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_email(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("users:delete"), {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_password(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("users:delete"),
            {"email": "testuser@test.com"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_different_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("users:delete"),
            {"email": "diffuser@test.com"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_same_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("users:delete"),
            {"email": "testuser@test.com", "password": "12345"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.get(pk=self.user.pk).is_active)


class IsVerifiedUserTest(TransactionTestCase):
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

    def test_not_logged_in(self):
        response = self.client.get(reverse("users:is_verified_user"))
        self.assertEqual(response.status_code, 400)

    def test_not_verified(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("users:is_verified_user"))
        self.assertEqual(response.status_code, 400)

    def test_verfied(self):
        self.client.force_login(self.user)
        email = EmailAddress.objects.filter(email="testuser@test.com").get()
        email.verified = True
        email.save()

        response = self.client.get(reverse("users:is_verified_user"))
        self.assertEqual(response.status_code, 200)


class PasswordResetTest(TransactionTestCase):
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
        self.assertEqual(mail.outbox[0].subject, "[Planscape] Password Reset E-mail")
        self.assertIn("http://localhost:4200/reset", mail.outbox[0].body)
        self.assertIn("Team Planscape", mail.outbox[0].body)

    def test_reset_confirmation_email(self):
        # POST request to get reset password link.
        self.client.post(reverse("rest_password_reset"), {"email": "testuser@test.com"})

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


class PasswordChangeTest(TransactionTestCase):
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
class LoginTest(TransactionTestCase):
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
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject, "[Planscape] Please Confirm Your E-mail Address"
        )

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
