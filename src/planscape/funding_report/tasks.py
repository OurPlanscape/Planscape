import logging
from datetime import timedelta

from celery import chord
from django.db import transaction
from django.utils import timezone
from datasets.models import DataLayer
from funding_report.models import (
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
    FundingReportMetric,
)
from funding_report.services import (
    build_datalayer_lookup,
    build_funding_report_results,
    calculate_project_area_delta,
)
from planning.models import ProjectArea
from planscape.celery import app

log = logging.getLogger(__name__)

STALE_RUNNING_TIMEOUT = timedelta(minutes=30)


@app.task()
def async_set_status(
    funding_opportunity_report_id: int,
    status: str,
) -> None:
    FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
        status=status
    )


@app.task()
def async_calculate_funding_report_delta(
    project_area_id: int,
    baseline_layer_id: int,
    value_layer_id: int,
    year: int,
    metric: str,
) -> dict | None:
    try:
        project_area = ProjectArea.objects.get(pk=project_area_id)
    except ProjectArea.DoesNotExist:
        log.warning(
            "ProjectArea with pk %s does not exist. Cannot calculate funding report delta.",
            project_area_id,
        )
        return None

    datalayer_lookup = {
        (metric, year, True): DataLayer.objects.get(pk=baseline_layer_id),
        (metric, year, False): DataLayer.objects.get(pk=value_layer_id),
    }
    try:
        return calculate_project_area_delta(
            project_area=project_area,
            metric=metric,
            year=year,
            datalayer_lookup=datalayer_lookup,
        )
    except Exception as exc:
        log.exception(
            "Failed to calculate funding report delta for project area %s, "
            "metric %s, year %s.",
            project_area_id,
            metric,
            year,
        )
        return {
            "error": str(exc),
            "project_id": project_area_id,
            "variable": metric,
            "year": year,
        }


@app.task()
def async_finalize_funding_report_results(
    project_results: list[dict | None],
    funding_opportunity_report_id: int,
) -> None:
    successes = []
    errors = []
    for result in project_results:
        if result is None:
            continue
        if "error" in result:
            errors.append(result)
        else:
            successes.append(result)

    results = build_funding_report_results(successes)
    if errors:
        results["errors"] = errors

    FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
        results=results,
        status=(
            FundingOpportunityReportStatus.FAILED
            if errors
            else FundingOpportunityReportStatus.SUCCESS
        ),
    )


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
        if (
            report.status == FundingOpportunityReportStatus.RUNNING
            and timezone.now() - report.updated_at < STALE_RUNNING_TIMEOUT
        ):
            log.warning(
                "FundingOpportunityReport with pk %s is already running, skipping duplicate dispatch.",
                funding_opportunity_report_id,
            )
            return
        report.status = FundingOpportunityReportStatus.RUNNING
        report.save(update_fields=["status", "updated_at"])
        project_area_ids = list(report.scenario.project_areas.values_list("id", flat=True))

    try:
        if not project_area_ids:
            async_finalize_funding_report_results(
                project_results=[],
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
            return

        datalayer_lookup = build_datalayer_lookup()
        tasks = []
        for metric in FundingReportMetric:
            for year in FUNDING_REPORT_YEARS:
                try:
                    baseline_layer = datalayer_lookup[(metric.value, year, True)]
                    value_layer = datalayer_lookup[(metric.value, year, False)]
                except KeyError:
                    raise ValueError(
                        "Missing funding report datalayer for variable="
                        f"{metric.value!r}, year={year}."
                    )
                tasks.extend(
                    async_calculate_funding_report_delta.si(
                        project_area_id=project_area_id,
                        baseline_layer_id=baseline_layer.pk,
                        value_layer_id=value_layer.pk,
                        year=year,
                        metric=metric.value,
                    )
                    for project_area_id in project_area_ids
                )
        callback = async_finalize_funding_report_results.s(
            funding_opportunity_report_id=funding_opportunity_report_id,
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
