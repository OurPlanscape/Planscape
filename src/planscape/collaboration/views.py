from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from collaboration.exceptions import InvalidOwnership
from collaboration.models import UserObjectRole
from planning.models import PlanningArea
from collaboration.permissions import CollaboratorPermission
from collaboration.serializers import (
    CreateUserObjectRolesSerializer,
    UserObjectRoleSerializer,
)
from collaboration.services import get_content_type
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


class GetInvitationsForObject(APIView):
    def get(self, request: Request, target_entity: str, object_pk: int):
        user = request.user
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

#TOASK: should we assume that we already have the record id and are just updating the role
class UpdateCollaboratorRole(APIView):
    def put(self, request: Request):
        try:
            user = request.user

            serializer = UserObjectRoleSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            content_type = serializer.validated_data.get("content_type")
            object_pk = serializer.validated_data.get("object_pk")
            role = serializer.validated_data.get("role")
            email = serializer.validated_data.get("email")
            serializer.is_valid(raise_exception=True)

            user_object_role = UserObjectRole.objects.filter(
                 content_type=content_type,
                 object_pk=object_pk,
                 email=email
             ).first()

            planning_area = PlanningArea.objects.get(id=object_pk)

            if not CollaboratorPermission.can_change(user, planning_area):
                 return Response(status=status.HTTP_403_FORBIDDEN)
            
            user_object_role.role = role
            user_object_role.save()

            serializer = UserObjectRoleSerializer(
                instance=user_object_role,
                many=False,
                context={
                    "request": request,
                },
            )
            return Response(serializer.data)
        
        except PlanningArea.DoesNotExist as pdne:
            print(f"We got this exception {pdne}")
            return Response({"message":"Object matching key does not exist"}, 
                            status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.exception(f"Exception updating permissions: {e}")
            raise
