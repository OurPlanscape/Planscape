from core.serializers import MultiSerializerMixin
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from planning.serializers import ListPlanningAreaSerializer
from planscape.filters import TrackedFilterBackend
from planscape.serializers import BaseErrorMessageSerializer
from rest_framework import pagination, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from workspaces.filters import PlanningWorkspaceFilterSet
from workspaces.models import Workspace, WorkspaceKind
from workspaces.permissions import WorkspaceViewPermission
from workspaces.serializers import (
    CreatePlanningWorkspaceSerializer,
    InviteWorkspaceMemberSerializer,
    ListWorkspaceSerializer,
    UpdatePlanningWorkspaceSerializer,
    UpdateWorkspaceMemberSerializer,
    WorkspaceMemberSerializer,
)
from workspaces.services import (
    accept_invite,
    create_workspace,
    delete_workspace,
    invite_member,
    remove_member,
    revoke_invite,
    update_invite_role,
    update_member_role,
)


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
    filter_backends = [TrackedFilterBackend, OrderingFilter]
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

    @extend_schema(
        description="Invite a user to this Workspace by email.",
        request=InviteWorkspaceMemberSerializer,
        responses={201: WorkspaceMemberSerializer},
    )
    @action(detail=True, methods=["post"], url_path="invite")
    def invite(self, request, pk=None):
        workspace = self.get_object()
        serializer = InviteWorkspaceMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access = invite_member(
            inviter=request.user,
            workspace=workspace,
            email=serializer.validated_data["email"],
            role=serializer.validated_data["role"],
            message=serializer.validated_data.get("message", ""),
        )
        return Response(
            WorkspaceMemberSerializer(access).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        description="Accept a pending invite to this Workspace.",
        request=None,
        responses={200: WorkspaceMemberSerializer},
    )
    @action(detail=True, methods=["post"], url_path="invite/accept")
    def accept_invite(self, request, pk=None):
        # Deliberately not self.get_object(): the requester doesn't have
        # workspace access yet (that's exactly what accepting grants them),
        # so the standard access-scoped queryset would 404 them out.
        workspace = get_object_or_404(
            Workspace.objects.filter(kind=WorkspaceKind.PLANNING),
            pk=pk,
        )
        access = accept_invite(user=request.user, workspace=workspace)
        return Response(WorkspaceMemberSerializer(access).data)

    @extend_schema(
        description="List members of, and pending invites to, this Workspace.",
        responses=WorkspaceMemberSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="users")
    def users(self, request, pk=None):
        workspace = self.get_object()
        qs = workspace.user_access.select_related("user").all()
        return Response(WorkspaceMemberSerializer(qs, many=True).data)

    @extend_schema(
        description="Change a member's role (PATCH), or remove/leave the "
        "Workspace (DELETE).",
        request=UpdateWorkspaceMemberSerializer,
        responses={200: WorkspaceMemberSerializer, 204: None},
    )
    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"users/(?P<user_id>\d+)",
    )
    def manage_user(self, request, pk=None, user_id=None):
        workspace = self.get_object()

        if request.method == "DELETE":
            remove_member(
                actor=request.user,
                workspace=workspace,
                target_user_id=int(user_id),
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = UpdateWorkspaceMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access = update_member_role(
            actor=request.user,
            workspace=workspace,
            target_user_id=int(user_id),
            role=serializer.validated_data["role"],
        )
        return Response(WorkspaceMemberSerializer(access).data)

    @extend_schema(
        description="Change a pending invite's role (PATCH), or revoke it "
        "(DELETE). Accepted members are managed through `users/<user_id>`.",
        request=UpdateWorkspaceMemberSerializer,
        responses={200: WorkspaceMemberSerializer, 204: None},
    )
    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"invites/(?P<invite_id>\d+)",
    )
    def manage_invite(self, request, pk=None, invite_id=None):
        workspace = self.get_object()

        if request.method == "DELETE":
            revoke_invite(
                actor=request.user,
                workspace=workspace,
                invite_id=int(invite_id),
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = UpdateWorkspaceMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access = update_invite_role(
            actor=request.user,
            workspace=workspace,
            invite_id=int(invite_id),
            role=serializer.validated_data["role"],
        )
        return Response(WorkspaceMemberSerializer(access).data)

    @extend_schema(
        description="List Planning Areas that belong to this Workspace.",
        responses=ListPlanningAreaSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="planning-areas")
    def planning_areas(self, request, pk=None):
        workspace = self.get_object()
        qs = workspace.planning_areas.filter(deleted_at=None)
        return Response(
            ListPlanningAreaSerializer(qs, many=True, context={"request": request}).data
        )
