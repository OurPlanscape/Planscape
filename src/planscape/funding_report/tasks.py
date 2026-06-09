import logging

from celery import chain, chord
from datasets.models import DataLayer
from django.conf import settings
from django.db import transaction
from funding_report.models import FundingOpportunityReport, FundingOpportunityReportStatus
from funding_report.services import (
    calculate_funding_opportunity_report,
    get_funding_report_calculation_datalayers,
)
from planscape.celery import app
from stands.models import Stand
from stands.services import (
    calculate_stand_zonal_stats_api,
    get_missing_stand_ids_for_datalayer_from_stand_list,
)

log = logging.getLogger(__name__)


@app.task()
def async_set_status(
    funding_opportunity_report_id: int,
    status: str,
) -> None:
    FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
        status=status
    )


@app.task()
def async_ensure_funding_report_metrics(
    funding_opportunity_report_id: int,
    datalayer_id: int,
) -> None:
    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        datalayer = DataLayer.objects.get(pk=datalayer_id)
        stand_size = report.scenario.get_stand_size()
        stand_ids = list(
            report.scenario.get_project_areas_stands(stand_size=stand_size).values_list(
                "id", flat=True
            )
        )
        missing_stand_ids = list(
            get_missing_stand_ids_for_datalayer_from_stand_list(
                stand_ids=stand_ids,
                datalayer=datalayer,
            )
        )
        batch_size = settings.STAND_METRICS_PAGE_SIZE
        for i in range(0, len(missing_stand_ids), batch_size):
            batch_stand_ids = missing_stand_ids[i : i + batch_size]
            calculate_stand_zonal_stats_api(
                stands=Stand.objects.filter(id__in=batch_stand_ids),
                datalayer=datalayer,
            )
    except FundingOpportunityReport.DoesNotExist:
        log.warning(
            "FundingOpportunityReport with pk %s does not exist. Cannot ensure metrics.",
            funding_opportunity_report_id,
        )
        return


@app.task()
def async_calculate_funding_opportunity_report(
    funding_opportunity_report_id: int,
) -> None:
    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        calculate_funding_opportunity_report(report)
    except FundingOpportunityReport.DoesNotExist:
        log.warning(
            "FundingOpportunityReport with pk %s does not exist. Cannot calculate report.",
            funding_opportunity_report_id,
        )
        return


@app.task()
def run_funding_opportunity_report(funding_opportunity_report_id: int) -> None:
    with transaction.atomic():
        try:
            report = FundingOpportunityReport.objects.select_for_update().get(
                pk=funding_opportunity_report_id
            )
        except FundingOpportunityReport.DoesNotExist:
            log.warning(
                "FundingOpportunityReport with pk %s does not exist. Cannot run report.",
                funding_opportunity_report_id,
            )
            return
        if report.status == FundingOpportunityReportStatus.RUNNING:
            log.warning(
                "FundingOpportunityReport with pk %s is already running, skipping duplicate dispatch.",
                funding_opportunity_report_id,
            )
            return
        FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
            status=FundingOpportunityReportStatus.RUNNING
        )

    try:
        datalayers = get_funding_report_calculation_datalayers()
        tasks = [
            async_ensure_funding_report_metrics.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
                datalayer_id=datalayer.pk,
            )
            for datalayer in datalayers
        ]
        callback = chain(
            async_calculate_funding_opportunity_report.si(
                funding_opportunity_report_id=funding_opportunity_report_id
            ),
            async_set_status.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
                status=FundingOpportunityReportStatus.SUCCESS,
            ),
        ).on_error(
            async_set_status.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
                status=FundingOpportunityReportStatus.FAILED,
            )
        )
        chord(tasks)(callback)
    except Exception:
        FundingOpportunityReport.objects.filter(
            pk=funding_opportunity_report_id
        ).update(status=FundingOpportunityReportStatus.FAILED)
        raise
