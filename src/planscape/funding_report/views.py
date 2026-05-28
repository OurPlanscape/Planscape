from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from funding_report.models import FundingOpportunityReport
from funding_report.serializers import FundingOpportunityReportSerializer
from funding_report.tasks import run_funding_opportunity_report
from planning.models import Scenario


class FundingOpportunityReportViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FundingOpportunityReportSerializer
    queryset = FundingOpportunityReport.objects.all()

    @action(methods=["post"], detail=False, url_path="run")
    def run(self, request):
        scenario_id = request.data.get("scenario")
        scenario = get_object_or_404(Scenario, pk=scenario_id)

        report, _ = FundingOpportunityReport.objects.get_or_create(
            scenario=scenario,
            defaults={"created_by": request.user},
        )

        run_funding_opportunity_report.delay(report.pk)

        serializer = self.get_serializer(instance=report)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
