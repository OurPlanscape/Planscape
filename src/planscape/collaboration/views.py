from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from collaboration.exceptions import InvalidOwnership
from collaboration.models import UserObjectRole
from collaboration.permissions import CollaboratorPermission
from collaboration.serializers import (
    CreateUserObjectRolesSerializer,
    UserObjectRoleSerializer,
)
import logging

from collaboration.services import create_invite
from collaboration.utils import check_for_permission

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


class GetInvitationsForObject(APIView):
    def get(self, request: Request, target_entity: str, object_pk: int):
        user = request.user
        content_type = ContentType.objects.get(model=target_entity)
        Model = content_type.model_class()
        instance = Model.objects.get(pk=object_pk)

        if not CollaboratorPermission.can_add(user, instance):
            return Response(status=status.HTTP_403_FORBIDDEN)

        user_object_roles = UserObjectRole.objects.filter(
            content_type=content_type,
            object_pk=object_pk,
        ).exclude(collaborator_id=user.pk)
        serializer = UserObjectRoleSerializer(instance=user_object_roles, many=True)
        return Response(serializer.data)
