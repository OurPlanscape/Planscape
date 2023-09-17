import logging

from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import PasswordResetSerializer, PasswordResetConfirmSerializer
from rest_framework import serializers
from django.contrib.auth.models import User

from users.forms import CustomAllAuthPasswordResetForm

# Configures global logging.
log = logging.getLogger(__name__)


class NameRegistrationSerializer(RegisterSerializer):

  first_name = serializers.CharField(required=False)
  last_name = serializers.CharField(required=False)

  def custom_signup(self, request, user):
    user.first_name = self.validated_data.get('first_name', '')
    user.last_name = self.validated_data.get('last_name', '')
    user.save(update_fields=['first_name', 'last_name'])


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'


class CustomPasswordResetSerializer(PasswordResetSerializer):
    """Custom serializer to tailor the password reset email url."""
    @property
    def password_reset_form_class(self):
        return CustomAllAuthPasswordResetForm


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    """Custom serializer to send email for password reset post-save."""
    def save(self):
        super(CustomPasswordResetConfirmSerializer, self).save()

        log.warning('qwer CustomPasswordResetConfirmSerializer')
        
        log.warning('asdf Reset send email.')
   

