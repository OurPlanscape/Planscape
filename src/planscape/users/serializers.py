import logging

from collaboration.services import link_invites
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import (
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
)
from django.contrib.auth.models import User
from django.core.mail import EmailMessage
from django.template.loader import get_template
from rest_framework import serializers
from rest_framework.relations import PrimaryKeyRelatedField

from planning.models import Scenario, ProjectArea
from impacts.models import TreatmentPlan
from collaboration.permissions import ScenarioPermission

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


class MartinResourceSerializer(serializers.Serializer):
    scenario_id = PrimaryKeyRelatedField(
        queryset=Scenario.objects.all(), help_text="Scenario ID.", required=False
    )
    project_area_id = PrimaryKeyRelatedField(
        queryset=ProjectArea.objects.all(), help_text="Project Area ID.", required=False
    )
    treatment_plan_id = PrimaryKeyRelatedField(
        queryset=TreatmentPlan.objects.all(),
        help_text="Treatment Plan ID.",
        required=False,
    )

    def validate_scenario_id(self, scenario):
        user = self.context.get("user")
        if not ScenarioPermission.can_view(user, scenario):
            raise serializers.ValidationError(
                "User does not have permission to view scenario"
            )

    def validate_project_area_id(self, project_area):
        user = self.context.get("user")
        if not ScenarioPermission.can_view(user, project_area.scenario):
            raise serializers.ValidationError(
                "User does not have permission to view scenario of given project area"
            )

    def validate_treatment_plan_id(self, treatment_plan):
        user = self.context.get("user")
        if not ScenarioPermission.can_view(user, treatment_plan.scenario):
            raise serializers.ValidationError(
                "User does not have permission to view scenario of given treatment plan"
            )
