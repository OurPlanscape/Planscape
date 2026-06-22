import logging
from datetime import timedelta

from celery import chord
from django.db import transaction
from django.utils import timezone
from datasets.models import DataLayer
from funding_report.models import (
    AET_IMPROVEMENT_DEFAULT_PERCENTAGE,
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
    FundingReportMetric,
)
from funding_report.services import (
    build_datalayer_lookup,
    build_funding_report_results,
    calculate_aet_improvement,
    calculate_biomass_volumes,
    calculate_project_area_delta,
    calculate_treatment_pixel_areas,
    generate_treatment_clip_datalayer,
    get_treatment_datalayer,
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
            "proj_id": (project_area.data or {}).get("proj_id"),
            "variable": metric,
            "year": year,
        }


@app.task()
def async_generate_treatment_datalayer(
    funding_opportunity_report_id: int,
) -> dict | None:
    if get_treatment_datalayer() is None:
        log.warning(
            "No funding report treatment datalayer configured. Skipping "
            "treatment datalayer generation for report %s.",
            funding_opportunity_report_id,
        )
        return None

    try:
        report = FundingOpportunityReport.objects.get(
            pk=funding_opportunity_report_id
        )
        datalayer = generate_treatment_clip_datalayer(report=report)
        return {"kind": "treatment_datalayer", "datalayer_id": datalayer.pk}
    except Exception as exc:
        log.exception(
            "Failed to generate treatment datalayer for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "treatment_datalayer", "error": str(exc)}


@app.task()
def async_calculate_treatment_areas(
    funding_opportunity_report_id: int,
) -> dict | None:
    if get_treatment_datalayer() is None:
        log.warning(
            "No funding report treatment datalayer configured. Skipping "
            "treatment pixel area calculation for report %s.",
            funding_opportunity_report_id,
        )
        return None

    try:
        report = FundingOpportunityReport.objects.get(
            pk=funding_opportunity_report_id
        )
        result = calculate_treatment_pixel_areas(report=report)
        return {"kind": "treatment_areas", **result}
    except Exception as exc:
        log.exception(
            "Failed to calculate treatment pixel areas for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "treatment_areas", "error": str(exc)}


@app.task()
def async_calculate_aet_improvement(
    funding_opportunity_report_id: int,
    percentage: float = AET_IMPROVEMENT_DEFAULT_PERCENTAGE,
) -> dict | None:
    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        result = calculate_aet_improvement(report=report, percentage=percentage)
        return {"kind": "aet_improvement", **result}
    except Exception as exc:
        log.exception(
            "Failed to calculate AET improvement for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "aet_improvement", "error": str(exc)}


@app.task()
def async_calculate_biomass_volumes(
    funding_opportunity_report_id: int,
) -> dict | None:
    try:
        report = FundingOpportunityReport.objects.get(pk=funding_opportunity_report_id)
        result = calculate_biomass_volumes(report=report)
        return {"kind": "biomass_volumes", **result}
    except Exception as exc:
        log.exception(
            "Failed to calculate biomass volumes for funding report %s.",
            funding_opportunity_report_id,
        )
        return {"kind": "biomass_volumes", "error": str(exc)}


@app.task()
def async_finalize_funding_report_results(
    project_results: list[dict | None],
    funding_opportunity_report_id: int,
) -> None:
    successes = []
    errors = []
    treatment_errors = []
    treatment_datalayer_id = None
    treatment_areas = None
    aet_improvement = None
    biomass_volumes = None

    for result in project_results:
        if result is None:
            continue
        kind = result.get("kind")
        if "error" in result:
            (treatment_errors if kind else errors).append(result)
            continue
        match kind:
            case "treatment_datalayer":
                treatment_datalayer_id = result["datalayer_id"]
            case "treatment_areas":
                treatment_areas = {"projects": result["projects"], "total": result["total"]}
            case "aet_improvement":
                aet_improvement = result
            case "biomass_volumes":
                biomass_volumes = result
            case _:
                successes.append(result)

    results = build_funding_report_results(successes)
    if aet_improvement is not None:
        results["summary"]["AET"] = {
            "percentage": aet_improvement["percentage"],
            "improved_acres": aet_improvement["improved_acres"],
            "total_project_area_acres": aet_improvement["total_project_area_acres"],
            "improved_area_percent": aet_improvement["improved_area_percent"],
        }
        results["projects"]["AET"] = aet_improvement["project_areas"]
    if biomass_volumes is not None:
        results["summary"]["BIOMASS_VOLUMES"] = biomass_volumes["summary"]
        results["projects"]["BIOMASS_VOLUMES"] = biomass_volumes["project_areas"]
    if treatment_areas is not None:
        results["treatment_areas"] = treatment_areas
    if treatment_errors:
        results["treatment_errors"] = treatment_errors
    if errors:
        results["errors"] = errors

    update_fields: dict = {
        "results": results,
        "status": (
            FundingOpportunityReportStatus.FAILED
            if errors
            else FundingOpportunityReportStatus.SUCCESS
        ),
    }
    if treatment_datalayer_id is not None:
        update_fields["treatment_datalayer_id"] = treatment_datalayer_id

    FundingOpportunityReport.objects.filter(pk=funding_opportunity_report_id).update(
        **update_fields
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
        tasks.append(
            async_generate_treatment_datalayer.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_calculate_treatment_areas.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_calculate_aet_improvement.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
        )
        tasks.append(
            async_calculate_biomass_volumes.si(
                funding_opportunity_report_id=funding_opportunity_report_id,
            )
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
