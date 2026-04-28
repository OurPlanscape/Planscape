from core.serializers import MultiSerializerMixin
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.mixins import (
    CreateModelMixin,
    DestroyModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
)
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from datasets.models import VisibilityOptions
from workspaces.filters import WorkspaceFilterSet
from workspaces.models import UserAccessWorkspace, Workspace, WorkspaceRole
from workspaces.serializers import (
    CreateWorkspaceSerializer,
    UpdateWorkspaceSerializer,
    WorkspaceSerializer,
)


class AdminWorkspaceViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
    CreateModelMixin,
    UpdateModelMixin,
    DestroyModelMixin,
    GenericViewSet,
):
    permission_classes = [IsAdminUser]
    serializer_class = WorkspaceSerializer
    serializer_classes = {
        "list": WorkspaceSerializer,
        "retrieve": WorkspaceSerializer,
        "create": CreateWorkspaceSerializer,
        "update": UpdateWorkspaceSerializer,
        "partial_update": UpdateWorkspaceSerializer,
    }
    pagination_class = LimitOffsetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = WorkspaceFilterSet

    def get_queryset(self):
        user = self.request.user
        return Workspace.objects.filter(
            Q(visibility=VisibilityOptions.PUBLIC) | Q(user_access__user=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save()
        UserAccessWorkspace.objects.create(
            user=request.user,
            workspace=workspace,
            role=WorkspaceRole.OWNER,
        )
        out_serializer = WorkspaceSerializer(instance=workspace)
        headers = self.get_success_headers(serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )
