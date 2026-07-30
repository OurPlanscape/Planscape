from django.urls import path

from funding_report.views import (
    public_funding_opportunity_report,
    public_funding_opportunity_report_project_areas,
)

app_name = "funding_report"

urlpatterns = [
    path(
        "<uuid:shared_link_uuid>/",
        public_funding_opportunity_report,
        name="public-funding-opportunity-report",
    ),
    path(
        "<uuid:shared_link_uuid>/project_areas/",
        public_funding_opportunity_report_project_areas,
        name="public-funding-opportunity-report-project-areas",
    ),
]
