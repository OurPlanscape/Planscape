from core.serializers import MultiSerializerMixin
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from planscape.serializers import BaseErrorMessageSerializer
from rest_framework import pagination, status, viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from workspaces.filters import PlanningWorkspaceFilterSet
from workspaces.models import Workspace
from workspaces.permissions import WorkspaceViewPermission
from workspaces.serializers import (
    CreatePlanningWorkspaceSerializer,
    ListWorkspaceSerializer,
    UpdatePlanningWorkspaceSerializer,
)
from workspaces.services import create_workspace, delete_workspace


@extend_schema_view(
    list=extend_schema(description="List Workspaces the requester has access to."),
    retrieve=extend_schema(
        description="Detail a Workspace.",
        responses={200: ListWorkspaceSerializer, 404: BaseErrorMessageSerializer},
    ),
    destroy=extend_schema(
        description="Delete a Workspace.",
        responses={204: None, 404: BaseErrorMessageSerializer},
    ),
    update=extend_schema(
        description="Update a Workspace.",
        responses={200: ListWorkspaceSerializer, 404: BaseErrorMessageSerializer},
    ),
    partial_update=extend_schema(
        description="Update a Workspace.",
        responses={200: ListWorkspaceSerializer, 404: BaseErrorMessageSerializer},
    ),
)
class WorkspaceViewSet(MultiSerializerMixin, viewsets.ModelViewSet):
    # this member is configured for introspection and swagger automatic generation
    queryset = Workspace.objects.none()
    permission_classes = [WorkspaceViewPermission]
    serializer_class = ListWorkspaceSerializer
    serializer_classes = {
        "create": CreatePlanningWorkspaceSerializer,
        "update": UpdatePlanningWorkspaceSerializer,
        "partial_update": UpdatePlanningWorkspaceSerializer,
    }
    pagination_class = pagination.LimitOffsetPagination
    filterset_class = PlanningWorkspaceFilterSet
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = [
        "name",
        "created_at",
        "updated_at",
        "planning_areas_count",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Workspace.objects.list_for_api(user=self.request.user)

    @extend_schema(description="Create a Workspace.")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = dict(serializer.validated_data)
        user = data.pop("created_by")
        workspace = create_workspace(user=user, **data)

        out_serializer = ListWorkspaceSerializer(
            instance=workspace,
            context={"request": request},
        )
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        out_serializer = ListWorkspaceSerializer(
            instance=self.get_queryset().get(pk=instance.pk),
            context={"request": request},
        )
        return Response(out_serializer.data)

    def perform_destroy(self, instance):
        delete_workspace(
            user=self.request.user,
            workspace=instance,
        )
