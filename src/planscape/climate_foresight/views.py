from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from climate_foresight.models import ClimateForesightRun
from climate_foresight.serializers import (
    ClimateForesightRunSerializer,
    ClimateForesightRunListSerializer,
)
from planning.models import PlanningArea


class ClimateForesightRunViewSet(viewsets.ModelViewSet):
    """ViewSet for ClimateForesightRun CRUD operations."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter runs by current user and optionally by planning area."""
        queryset = ClimateForesightRun.objects.list_by_user(self.request.user)

        planning_area_id = self.request.query_params.get("planning_area")
        if planning_area_id:
            queryset = queryset.filter(planning_area_id=planning_area_id)

        return queryset

    def get_serializer_class(self):
        """Use different serializers for list vs detail views."""
        if self.action == "list":
            return ClimateForesightRunListSerializer
        return ClimateForesightRunSerializer

    def perform_create(self, serializer):
        """Set the user when creating a new run."""
        serializer.save(created_by=self.request.user)

    @action(
        detail=False,
        methods=["get"],
        url_path="by-planning-area/(?P<planning_area_id>[^/.]+)",
    )
    def by_planning_area(self, request, planning_area_id=None):
        """Get all runs for a specific planning area."""
        planning_area = get_object_or_404(
            PlanningArea.objects.list_by_user(request.user), id=planning_area_id
        )

        runs = ClimateForesightRun.objects.list_by_planning_area(
            planning_area, request.user
        )
        serializer = ClimateForesightRunListSerializer(runs, many=True)
        return Response(serializer.data)
