from django.urls import path

from funding_report.views import public_funding_opportunity_report

app_name = "funding_report"

urlpatterns = [
    path(
        "<uuid:shared_link_uuid>/",
        public_funding_opportunity_report,
        name="public-funding-opportunity-report",
    ),
]
