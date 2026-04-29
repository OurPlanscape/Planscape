from core.serializers import MultiSerializerMixin
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
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
    WorkspaceDatasetSerializer,
    WorkspaceSerializer,
    WorkspaceStyleSerializer,
    WorkspaceUserAccessSerializer,
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

    @extend_schema(
        description="List datasets belonging to this workspace.",
        responses=WorkspaceDatasetSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="datasets")
    def datasets(self, request, pk=None):
        workspace = self.get_object()
        qs = workspace.datasets.all()
        serializer = WorkspaceDatasetSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(
        description="List styles belonging to this workspace.",
        responses=WorkspaceStyleSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="styles")
    def styles(self, request, pk=None):
        workspace = self.get_object()
        qs = workspace.styles.all()
        serializer = WorkspaceStyleSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(
        description="List users with access to this workspace.",
        responses=WorkspaceUserAccessSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="users")
    def users(self, request, pk=None):
        workspace = self.get_object()
        qs = workspace.user_access.select_related("user").all()
        serializer = WorkspaceUserAccessSerializer(qs, many=True)
        return Response(serializer.data)

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
