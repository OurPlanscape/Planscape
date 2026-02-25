import logging

from datasets.models import DataLayer, DataLayerStatus
from datasets.serializers import BrowseDataLayerSerializer
from django.conf import settings
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from planning.models import GeoPackageStatus, PlanningArea
from planscape.serializers import BaseErrorMessageSerializer
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from climate_foresight.filters import (
    ClimateForesightPillarFilterSet,
    ClimateForesightRunFilterSet,
)
from climate_foresight.models import (
    ClimateForesightPillar,
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
    ClimateForesightRunStatus,
)
from climate_foresight.orchestration import (
    check_run_completion,
    start_climate_foresight_analysis,
)
from climate_foresight.permissions import ClimateForesightViewPermission
from climate_foresight.serializers import (
    ClimateForesightPillarSerializer,
    ClimateForesightRunListSerializer,
    ClimateForesightRunSerializer,
    CopyClimateForesightRunSerializer,
)
from climate_foresight.tasks import async_generate_climate_foresight_geopackage

log = logging.getLogger(__name__)


class ClimateForesightRunViewSet(viewsets.ModelViewSet):
    """ViewSet for ClimateForesightRun CRUD operations."""

    permission_classes = [ClimateForesightViewPermission]
    filterset_class = ClimateForesightRunFilterSet

    def get_queryset(self):
        """Filter runs by current user with prefetched related data."""
        from climate_foresight.models import ClimateForesightPillarRollup

        return (
            ClimateForesightRun.objects.list_by_user(self.request.user)
            .select_related(
                "planning_area",
                "created_by",
                # Select promote and its datalayers
                "promote_analysis",
                "promote_analysis__mpat_strength_datalayer",
                "promote_analysis__adapt_protect_datalayer",
                "promote_analysis__integrated_condition_score_datalayer",
                # Select landscape rollup and its current datalayer
                "landscape_rollup",
                "landscape_rollup__current_datalayer",
            )
            .prefetch_related(
                # Prefetch styles for promote datalayers
                "promote_analysis__mpat_strength_datalayer__styles",
                "promote_analysis__adapt_protect_datalayer__styles",
                "promote_analysis__integrated_condition_score_datalayer__styles",
                # Prefetch pillar rollups with their datalayers and styles
                Prefetch(
                    "pillar_rollups",
                    queryset=ClimateForesightPillarRollup.objects.select_related(
                        "rollup_datalayer", "pillar"
                    ).prefetch_related("rollup_datalayer__styles"),
                ),
                # Prefetch styles for landscape rollup current datalayer
                "landscape_rollup__current_datalayer__styles",
            )
        )

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
            .exclude(dataset_id=settings.CLIMATE_FORESIGHT_DATASET_ID)
            .select_related("organization", "dataset", "category")
            .prefetch_related("styles")
        )
        serializer = BrowseDataLayerSerializer(datalayers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def run_analysis(self, request, pk=None):
        """
        Start the full Climate Foresight analysis pipeline.

        This endpoint kicks off the entire workflow:
        1. Normalize all input layers
        2. Rollup pillars
        3. Rollup landscape (current + future)
        4. Run PROMOTe analysis (MPAT outputs)

        The run must be in DRAFT status and have:
        - All input layers with favor_high set
        - All input layers assigned to pillars

        Returns a summary of what was started.
        """
        run = self.get_object()

        try:
            result = start_climate_foresight_analysis(run.id)
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            raise ValidationError(str(e))

    @action(detail=True, methods=["post"])
    def trigger_next_steps(self, request, pk=None):
        """
        Check run completion status.

        With the new workflow model, the entire pipeline runs as a single
        Celery chain. This endpoint now just checks completion status.

        Returns a summary of the run status.
        """
        run = self.get_object()

        results = {
            "run_id": run.id,
            "completion_check": check_run_completion(run.id),
        }

        return Response(results, status=status.HTTP_200_OK)

    @extend_schema(
        description="Download all Climate Foresight outputs as a zipped archive of GeoTIFFs.",
        responses={
            200: OpenApiTypes.BINARY,
            400: BaseErrorMessageSerializer,
            404: BaseErrorMessageSerializer,
        },
    )
    @action(detail=True, methods=["get"], filterset_class=None)
    def download(self, request, pk=None):
        """
        Get download URL for Climate Foresight run geopackage.

        Returns a JSON response with the download status and URL (if ready).
        The geopackage contains GeoTIFF rasters for:
        - MPAT outputs (matrix, strength, individual strategies)
        - Pillar rollups
        - Landscape rollups (current and future)
        - Normalized input layers

        The run must be in 'done' status.

        Response format:
        - status: "ready" | "processing" | "pending" | "failed"
        - download_url: Signed GCS URL (only when status="ready")
        - message: Status message
        """

        run = self.get_object()

        # Following 2 checks validate but cases should never happen with normal usage
        if run.status != ClimateForesightRunStatus.DONE:
            raise ValidationError(
                f"Cannot download: run status is {run.status}, expected 'done'"
            )

        if not hasattr(run, "promote_analysis"):
            raise ValidationError("No PROMOTe analysis found for this run")

        promote = run.promote_analysis

        if promote.geopackage_status == GeoPackageStatus.SUCCEEDED:
            download_url = promote.get_geopackage_url()
            if download_url:
                return Response(
                    {
                        "status": "ready",
                        "download_url": download_url,
                    }
                )
            else:
                return Response(
                    {"status": "error", "message": "Download URL generation failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        elif promote.geopackage_status == GeoPackageStatus.PROCESSING:
            return Response(
                {
                    "status": "processing",
                    "message": "Geopackage is being generated. Please try again later.",
                }
            )

        else:
            if promote.geopackage_status == GeoPackageStatus.FAILED:
                log.warning(
                    f"Previous geopackage generation failed for run {run.id}. Trying again."
                )

            if promote.geopackage_status is None:
                promote.geopackage_status = GeoPackageStatus.PENDING
                promote.save(update_fields=["geopackage_status", "updated_at"])

            async_generate_climate_foresight_geopackage.delay(run.id)

            return Response(
                {
                    "status": "pending",
                    "message": "Geopackage generation has been queued.",
                }
            )

    @action(detail=True, methods=["post"])
    def copy(self, request, pk=None):
        """
        Create a copy of a Climate Foresight run. Only copies datalayers
        """
        source_run = self.get_object()
        serializer = CopyClimateForesightRunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_run = ClimateForesightRun.objects.create(
            name=serializer.validated_data["name"],
            planning_area=source_run.planning_area,
            created_by=request.user,
            status=ClimateForesightRunStatus.DRAFT,
            current_step=1,
            furthest_step=1,
        )

        for input_layer in source_run.input_datalayers.all():
            ClimateForesightRunInputDataLayer.objects.create(
                run=new_run,
                datalayer=input_layer.datalayer,
            )

        return Response(
            ClimateForesightRunSerializer(new_run).data,
            status=status.HTTP_201_CREATED,
        )


class ClimateForesightPillarViewSet(viewsets.ModelViewSet):
    """ViewSet for ClimateForesightPillar CRUD operations."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ClimateForesightPillarSerializer
    filterset_class = ClimateForesightPillarFilterSet

    def get_queryset(self):
        """
        Return global pillars and custom pillars for runs the user has access to.
        For list view, the filter will further narrow this based on query params.
        For detail/delete views, we need to include custom pillars so they can be accessed by ID.
        """
        # Get all runs the user has access to
        user_runs = ClimateForesightRun.objects.list_by_user(self.request.user)

        # Return global pillars + custom pillars from user's runs
        return ClimateForesightPillar.objects.filter(
            Q(run__isnull=True) | Q(run__in=user_runs)
        ).order_by("name")

    def perform_destroy(self, instance):
        """Only allow deletion of custom pillars when run is in draft mode."""
        if not instance.can_delete():
            if not instance.is_custom:
                raise PermissionDenied("Global pillars cannot be deleted.")
            raise PermissionDenied(
                "Pillars can only be deleted when the analysis is in draft mode."
            )

        super().perform_destroy(instance)
