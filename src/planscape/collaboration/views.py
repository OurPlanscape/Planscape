from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from collaboration.exceptions import InvalidOwnership
from collaboration.serializers import (
    CreateUserObjectRolesSerializer,
    UserObjectRoleSerializer,
)
import logging

from collaboration.services import create_invite

logger = logging.getLogger(__name__)


class CreateInvite(APIView):
    def post(self, request, format=None):
        serializer = CreateUserObjectRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_entity = serializer.validated_data.get("target_entity")
        object_pk = serializer.validated_data.get("object_pk")
        current_user = request.user
        emails = serializer.validated_data.get("emails")
        role = serializer.validated_data.get("role")
        message = serializer.validated_data.get("message")
        try:
            invites = [
                create_invite(
                    current_user, email, role, target_entity, object_pk, message
                )
                for email in emails
            ]
            out_serializer = UserObjectRoleSerializer(
                instance=invites, many=True, context={"request": request}
            )
            return Response(out_serializer.data, status=status.HTTP_201_CREATED)
        except InvalidOwnership as ownEx:
            logger.warning(ownEx)
            return Response(
                {"message": f"You cannot invite other users to this {target_entity}"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except Exception as ex:
            # this collects exception info and forwards it to sentry.
            logger.exception("Something failed during the creation of a new invite.")
            # this will return a 500
            raise
