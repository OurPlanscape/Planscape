import logging

from django.contrib.auth.models import User
from allauth.account.utils import send_email_confirmation
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer,
)
from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMessage
from django.template import Context
from django.template.loader import get_template
from rest_framework import serializers
from collaboration.services import link_invites

from users.forms import CustomAllAuthPasswordResetForm

# Configures global logging.
log = logging.getLogger(__name__)


class NameRegistrationSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    def custom_signup(self, request, user):
        user.first_name = self.validated_data.get("first_name", "")
        user.last_name = self.validated_data.get("last_name", "")
        user.save(update_fields=["first_name", "last_name"])

        link_invites(user)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"


class CustomPasswordResetSerializer(PasswordResetSerializer):
    """Custom serializer to tailor the password reset email url."""

    @property
    def password_reset_form_class(self):
        return CustomAllAuthPasswordResetForm

    def save(self):
        log.info("Password reset requested for %s", self.data["email"])
        super(CustomPasswordResetSerializer, self).save()


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    """Custom serializer to send email for password reset post-save."""

    def reactivate_user(self):
        log.info(f"Reactivating user {self.user.get_username()} for password reset.")
        self.user.is_active = True
        self.user.save()

    def save(self):
        if not self.user.is_active:
            self.reactivate_user()
        super(CustomPasswordResetConfirmSerializer, self).save()
        self._send_email()

    def _send_email(self):
        message = get_template("email/password/password_reset_confirmation_message.txt")
        user = User.objects.get(username=str(self.user))
        content = message.render({"name": f"{user.first_name} {user.last_name}"})

        email = EmailMessage(
            subject="[Planscape] Password Reset",
            body=content,
            to=[user.email],
        )
        email.send()


class CustomPasswordChangeSerializer(PasswordChangeSerializer):
    """Custom serializer to send email for password change post-save."""

    def save(self):
        super(CustomPasswordChangeSerializer, self).save()
        log.info("Password reset for %s", self.request.user)
        self._send_email()

    def _send_email(self):
        message = get_template(
            "email/password/password_change_confirmation_message.txt"
        )
        user = User.objects.get(username=str(self.user))
        content = message.render({"name": f"{user.first_name} {user.last_name}"})

        email = EmailMessage(
            subject="[Planscape] Password Changed",
            body=content,
            to=[user.email],
        )
        email.send()
