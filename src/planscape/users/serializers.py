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


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"


class CustomLoginSerializer(LoginSerializer):
    """Custom serializer to re-send user verification email if they are not verified."""

    def validate(self, attrs):
        try:
            # We want to call the parent validate function first to ensure that
            # the username and password combination is valid.
            return super(CustomLoginSerializer, self).validate(attrs)
        except Exception as e:
            error_msg = e.args[0]
            if error_msg == "E-mail is not verified.":
                # Send email again, respecting allauth ratelimits.
                email_addr = attrs["email"]
                user = User.objects.filter(email=email_addr).get()
                send_email_confirmation(
                    self.context["request"], user=user, email=email_addr
                )
            # Re-raise the error to halt the login, and send the error to the
            # frontend.
            raise e


class CustomPasswordResetSerializer(PasswordResetSerializer):
    """Custom serializer to tailor the password reset email url."""

    @property
    def password_reset_form_class(self):
        return CustomAllAuthPasswordResetForm


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    """Custom serializer to send email for password reset post-save."""

    def save(self):
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
