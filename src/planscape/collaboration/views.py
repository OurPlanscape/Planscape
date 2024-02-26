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

    def validate_ownership(self, current_user, target_entity, object_pk):
        pass

    def post(self, request, format=None):

        serializer = CreateUserObjectRolesSerializer(request.data)
        serializer.is_valid(raise_exception=True)

        target_entity = serializer.validated_data.get("target_entity")
        object_pk = serializer.validated_data.get("object_pk")
        current_user = request.user

        try:
            invite = create_invite(
                inviter=request.user,
                **serializer.validated_data,
            )
            out_serializer = UserObjectRoleSerializer(instance=invite)
            return Response(out_serializer.data)
        except InvalidOwnership:
            return Response(
                {"message": f"You cannot invite other users to this {target_entity}"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except Exception as ex:
            # this collects exception info and forwards it to sentry.
            logger.exception("Something failed during the creation of a new invite.")
            raise
