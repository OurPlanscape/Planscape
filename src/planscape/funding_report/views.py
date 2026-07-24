
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from funding_report.models import FundingOpportunityReportSharedLink
from funding_report.serializers import (
    FundingOpportunityReportPublicProjectAreaSerializer,
    FundingOpportunityReportPublicSerializer,
)


@extend_schema_view(
    retrieve=extend_schema(
        description="Shared Funding Opportunity Report.",
        responses={200: FundingOpportunityReportPublicSerializer},
    )
)
@api_view(["GET"])
@permission_classes([AllowAny])
def public_funding_opportunity_report(request, shared_link_uuid):
    shared_link = get_object_or_404(
        FundingOpportunityReportSharedLink.objects.select_related("report"),
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
    queryset = shared_link.report.scenario.project_areas.all()
    serializer = FundingOpportunityReportPublicProjectAreaSerializer(queryset, many=True)
    return Response(serializer.data)
