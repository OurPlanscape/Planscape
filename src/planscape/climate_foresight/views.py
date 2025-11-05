from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import models
from django.shortcuts import get_object_or_404
from climate_foresight.models import ClimateForesightPillar, ClimateForesightRun
from climate_foresight.serializers import (
    ClimateForesightPillarSerializer,
    ClimateForesightRunSerializer,
    ClimateForesightRunListSerializer,
)
from climate_foresight.filters import (
    ClimateForesightRunFilterSet,
    ClimateForesightPillarFilterSet,
)
from planning.models import PlanningArea
from datasets.models import DataLayer, DataLayerStatus
from datasets.serializers import BrowseDataLayerSerializer


class ClimateForesightRunViewSet(viewsets.ModelViewSet):
    """ViewSet for ClimateForesightRun CRUD operations."""

    permission_classes = [permissions.IsAuthenticated]
    filterset_class = ClimateForesightRunFilterSet

    def get_queryset(self):
        """Filter runs by current user."""
        return ClimateForesightRun.objects.list_by_user(self.request.user)

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

    @action(detail=False, methods=["get"])
    def datalayers(self, request):
        """Get data layers available for climate foresight analysis."""
        datalayers = (
            DataLayer.objects.filter(
                metadata__modules__has_key="climate_foresight",
                status=DataLayerStatus.READY,
            )
            .select_related("organization", "dataset", "category")
            .prefetch_related("styles")
        )
        serializer = BrowseDataLayerSerializer(datalayers, many=True)
        return Response(serializer.data)


class ClimateForesightPillarViewSet(viewsets.ModelViewSet):
    """ViewSet for ClimateForesightPillar CRUD operations."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ClimateForesightPillarSerializer
    filterset_class = ClimateForesightPillarFilterSet

    def get_queryset(self):
        """
        Return pillars available to the user.
        - Global pillars (run=None) are visible to all
        - Custom pillars are only visible if the user owns the associated run
        """
        user = self.request.user
        return ClimateForesightPillar.objects.filter(
            models.Q(run__isnull=True) | models.Q(run__created_by=user)
        ).order_by("order", "name")

    def perform_destroy(self, instance):
        """Only allow deletion of custom pillars when run is in draft mode."""
        if not instance.can_delete():
            if not instance.is_custom:
                raise PermissionDenied("Global pillars cannot be deleted.")
            raise PermissionDenied(
                "Pillars can only be deleted when the analysis is in draft mode."
            )

        super().perform_destroy(instance)
