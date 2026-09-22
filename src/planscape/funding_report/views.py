
from django.conf import settings
from django.db.models.expressions import RawSQL
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from funding_report.models import FundingOpportunityReportSharedLink
from funding_report.serializers import (
    FundingOpportunityReportPublicProjectAreaSerializer,
    FundingOpportunityReportPublicProjectAreaQueryParamsSerializer,
    FundingOpportunityReportPublicSerializer,
)
from planning.models import GeoPackageStatus, ScenarioPlanningApproach
from planscape.analytics import track_event
from planscape.serializers import BaseErrorMessageSerializer


@extend_schema(
    description="Shared Funding Opportunity Report.",
    responses={200: FundingOpportunityReportPublicSerializer},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def public_funding_opportunity_report(request, shared_link_uuid):
    shared_link = get_object_or_404(
        (
            FundingOpportunityReportSharedLink.objects
            .select_related("report")
            .select_related("report__scenario")
            .select_related("report__scenario__planning_area")
        ),
        uuid=shared_link_uuid,
        deleted_at__isnull=True,
    )
    serializer = FundingOpportunityReportPublicSerializer(
        instance=shared_link.report,
        context=shared_link.configuration
    )
    # Tracked here rather than on the client so opens still register for
    # recipients blocking the web SDK. The project areas endpoint is loaded by
    # the same page, so it deliberately does not track - it would double count.
    is_authenticated = request.user.is_authenticated
    track_event(
        name="funding_report.shared_link.opened",
        properties={
            "shared_link_uuid": str(shared_link.uuid),
            "report_id": shared_link.report_id,
            "scenario_id": shared_link.report.scenario_id,
            "authenticated": is_authenticated,
        },
        user_id=request.user.pk if is_authenticated else None,
    )
    return Response(serializer.data)


@extend_schema(
    description="Project Areas for a shared Funding Opportunity Report.",
    parameters=[FundingOpportunityReportPublicProjectAreaQueryParamsSerializer],
    responses={200: FundingOpportunityReportPublicProjectAreaSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def public_funding_opportunity_report_project_areas(request, shared_link_uuid):
    shared_link = get_object_or_404(
        FundingOpportunityReportSharedLink.objects.select_related("report__scenario"),
        uuid=shared_link_uuid,
        deleted_at__isnull=True,
    )
    queryset = shared_link.report.scenario.project_areas.annotate(
        treatment_rank=RawSQL("COALESCE((data->>'treatment_rank')::int, 1)", [])
    ).order_by("treatment_rank")
    scenario = shared_link.report.scenario
    params_serializer = FundingOpportunityReportPublicProjectAreaQueryParamsSerializer(
        data=request.query_params
    )
    params_serializer.is_valid(raise_exception=True)
    number_of_features = params_serializer.data.get("number_of_features")

    if number_of_features:
        queryset = queryset[:number_of_features]
    if (
        not number_of_features
        and scenario.planning_approach
        == ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS
    ):
        queryset = queryset[:settings.DEFAULT_NUMBER_OF_FEATURES_PRIORITIZE_SUB_UNITS]

    serializer = FundingOpportunityReportPublicProjectAreaSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    description="Get the download URL for a shared Funding Opportunity Report's geopackage.",
    responses={
        200: OpenApiTypes.OBJECT,
        404: BaseErrorMessageSerializer,
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def public_funding_opportunity_report_geopackage_download(request, shared_link_uuid):
    shared_link = get_object_or_404(
        FundingOpportunityReportSharedLink.objects.select_related(
            "report", "report__scenario"
        ),
        uuid=shared_link_uuid,
        deleted_at__isnull=True,
    )
    report = shared_link.report

    if report.geopackage_status == GeoPackageStatus.SUCCEEDED:
        download_url = report.get_geopackage_url()
        if download_url:
            is_authenticated = request.user.is_authenticated
            track_event(
                name="funding_report.shared_link.geopackage_downloaded",
                properties={
                    "shared_link_uuid": str(shared_link.uuid),
                    "report_id": report.pk,
                    "scenario_id": report.scenario_id,
                    "authenticated": is_authenticated,
                },
                user_id=request.user.pk if is_authenticated else None,
            )
            return Response({"status": "ready", "download_url": download_url})
        return Response(
            {"status": "error", "message": "Download URL generation failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if report.geopackage_status == GeoPackageStatus.PROCESSING:
        return Response(
            {
                "status": "processing",
                "message": "Geopackage is being generated. Please try again later.",
            }
        )

    return Response(
        {
            "status": "pending",
            "message": "Geopackage is not available yet.",
        }
    )
