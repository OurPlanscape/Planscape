import logging
from django.conf import settings
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from planning.models import UserPrefs
from planning.serializers import UserPrefsSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.exceptions import ValidationError

log = logging.getLogger(__name__)


class UserPreferencesView(APIView):
    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response(
                UserPrefsSerializer({"error": "Authentication Required"}).data,
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            user_prefs, _ = UserPrefs.objects.get_or_create(user_id=user.id)
        except UserPrefs.DoesNotExist:
            return Response(
                UserPrefsSerializer({"error": "User Preferences Not Found"}).data,
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            UserPrefsSerializer(user_prefs).data,
            content_type="application/json",
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user_prefs, created = UserPrefs.objects.get_or_create(user_id=user.id)
            # Merge existing preferences with incoming JSON data

            data = {"preferences": {**request.data}}
            if not created:
                data = {"preferences": {**user_prefs.preferences, **request.data}}

            serializer = UserPrefsSerializer(
                instance=user_prefs, data=data, partial=True
            )
            # Validate and save the serializer data
            if serializer.is_valid():
                serializer.save()
                return Response(
                    {"message": "User preferences updated successfully"},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            log.error(f"ERROR: Unable to update userprefs: {e}")
            raise

    def delete(self, request, preference_key):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            user_prefs, created = UserPrefs.objects.get_or_create(user_id=user.id)
            if not created and preference_key in user_prefs.preferences:
                del user_prefs.preferences[preference_key]
                user_prefs.save()
        except (UserPrefs.DoesNotExist, KeyError):
            return Response(status=404)

        return Response(UserPrefsSerializer(user_prefs).data)
