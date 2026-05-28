from rest_framework.routers import SimpleRouter

from funding_report.views import FundingOpportunityReportViewSet

router = SimpleRouter()
router.register(
    r"funding-opportunity-reports",
    FundingOpportunityReportViewSet,
    basename="funding-opportunity-reports",
)
