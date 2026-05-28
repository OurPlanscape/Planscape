import time

from planscape.celery import app


@app.task()
def run_funding_opportunity_report(funding_opportunity_report_id: int) -> None:
    from funding_report.models import FundingOpportunityReport, FundingOpportunityReportStatus

    FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
        status=FundingOpportunityReportStatus.RUNNING
    )

    try:
        time.sleep(60)
        FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
            status=FundingOpportunityReportStatus.SUCCESS
        )
    except Exception:
        FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
            status=FundingOpportunityReportStatus.FAILED
        )
        raise
