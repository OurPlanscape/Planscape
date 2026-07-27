
from django.conf import settings
from django.db.models.expressions import RawSQL
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from funding_report.models import FundingOpportunityReportSharedLink
from funding_report.serializers import (
    FundingOpportunityReportPublicProjectAreaSerializer,
    FundingOpportunityReportPublicProjectAreaQueryParamsSerializer,
    FundingOpportunityReportPublicSerializer,
)
from planning.models import ScenarioPlanningApproach


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
