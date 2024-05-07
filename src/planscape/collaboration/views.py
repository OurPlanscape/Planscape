import logging
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from planscape.exceptions import InvalidOwnership
from collaboration.models import UserObjectRole
from collaboration.permissions import CollaboratorPermission
from collaboration.serializers import (
    CreateUserObjectRolesSerializer,
    UserObjectRoleSerializer,
)

from collaboration.services import create_invite

logger = logging.getLogger(__name__)


class CreateInvite(APIView):
    def post(self, request, format=None):
        serializer = CreateUserObjectRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_entity = serializer.validated_data.get("target_entity")
        object_pk = serializer.validated_data.get("object_pk")
        current_user = request.user
        if not current_user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

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


class InvitationsForObject(APIView):
    def get(self, request: Request, target_entity: str, object_pk: int):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        content_type = ContentType.objects.get(model=target_entity)
        Model = content_type.model_class()
        instance = Model.objects.get(pk=object_pk)

        if not CollaboratorPermission.can_view(user, instance):
            return Response(status=status.HTTP_403_FORBIDDEN)

        user_object_roles = UserObjectRole.objects.filter(
            content_type=content_type,
            object_pk=object_pk,
        ).exclude(collaborator_id=user.pk)
        serializer = UserObjectRoleSerializer(
            instance=user_object_roles,
            many=True,
            context={
                "request": request,
            },
        )
        return Response(serializer.data)

    def patch(self, request: Request, invitation_id: int):
        try:
            user = request.user
            if not user.is_authenticated:
                return Response(
                    {"error": "Authentication Required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            user_object_role_obj = UserObjectRole.objects.get(pk=invitation_id)
            serializer = UserObjectRoleSerializer(
                instance=user_object_role_obj,
                data={"role": request.data.get("role")},
                partial=True,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)

            Model = user_object_role_obj.content_type.model_class()
            instance = Model.objects.get(pk=user_object_role_obj.object_pk)

            if not CollaboratorPermission.can_change(user, instance):
                return Response(
                    {"message": "User does not have permission to change this role."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            serializer.update(
                instance=user_object_role_obj, validated_data=serializer.validated_data
            )
            return Response(serializer.data)

        except UserObjectRole.DoesNotExist as dne:
            logger.exception("UserObjectRole exception: %s", dne)
            return Response(
                {"message": "User Object Role record matching id does not exist"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except ObjectDoesNotExist as odne:
            logger.exception(" exception: %s", odne)
            return Response(
                {
                    "message": "A model object related to this user permission does not exist"
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception("Exception updating permissions: %s", e)
            raise

    def delete(self, request: Request, invitation_id: int):
        try:
            user = request.user
            if not user.is_authenticated:
                return Response(
                    {"error": "Authentication Required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            user_object_role_obj = UserObjectRole.objects.get(pk=invitation_id)

            Model = user_object_role_obj.content_type.model_class()
            instance = Model.objects.get(pk=user_object_role_obj.object_pk)

            if not CollaboratorPermission.can_delete(user, instance):
                return Response(
                    {
                        "message": "User does not have permission to delete this assignment."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            user_object_role_obj.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except UserObjectRole.DoesNotExist as dne:
            logger.exception("UserObjectRole exception: %s", dne)
            return Response(
                {"message": "User Object Role record matching id does not exist"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except ObjectDoesNotExist as odne:
            logger.exception(" exception: %s", odne)
            return Response(
                {
                    "message": "A model object related to this user permission does not exist"
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception("Exception deleting user_object_role: %s", e)
            raise
