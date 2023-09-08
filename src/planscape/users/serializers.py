from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import PasswordResetSerializer
from rest_framework import serializers
from django.contrib.auth.models import User
from users.forms import CustomAllAuthPasswordResetForm


class NameRegistrationSerializer(RegisterSerializer):

  first_name = serializers.CharField(required=False)
  last_name = serializers.CharField(required=False)

  def custom_signup(self, request, user):
    user.first_name = self.validated_data.get('first_name', '')
    user.last_name = self.validated_data.get('last_name', '')
    user.save(update_fields=['first_name', 'last_name'])

class CustomPasswordResetSerializer(PasswordResetSerializer):
  @property
  def password_reset_form_class(self):
    return CustomAllAuthPasswordResetForm

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'
