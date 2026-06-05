from typing import Any, Dict, List, Optional

from datasets.models import DataLayer, DataLayerType
from planning.models import ProjectArea
from stands.calculator import calculate_delta
from stands.models import Stand, StandMetric, StandSizeChoices, pixels_from_size

from funding_report.models import (
    FUNDING_REPORT_ACTION,
    FUNDING_REPORT_AGGREGATION,
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingReportMetric,
)


def get_funding_report_datalayer(
    metric: FundingReportMetric,
    year: int,
    baseline: bool,
) -> DataLayer:
    query = {
        "modules": {
            "funding_report": {
                "year": year,
                "baseline": baseline,
                "variable": metric.value,
            }
        }
    }
    return DataLayer.objects.get(
        type=DataLayerType.RASTER,
        metadata__contains=query,
    )


def get_funding_report_calculation_datalayers() -> List[DataLayer]:
    datalayers = []
    for metric in FundingReportMetric:
        for year in FUNDING_REPORT_YEARS:
            datalayers.append(
                get_funding_report_datalayer(
                    metric=metric,
                    year=year,
                    baseline=True,
                )
            )
            datalayers.append(
                get_funding_report_datalayer(
                    metric=metric,
                    year=year,
                    baseline=False,
                )
            )
    return datalayers


def get_metric_value(metric: Optional[StandMetric]) -> Optional[float]:
    if not metric:
        return None
    return metric.avg


def calculate_stand_results(
    baseline_metrics: Dict[int, StandMetric],
    changed_metrics: Dict[int, StandMetric],
    metric: FundingReportMetric,
    year: int,
    stand_size: str,
) -> List[Dict[str, Any]]:
    results = []
    for stand_id, baseline_metric in baseline_metrics.items():
        baseline_value = get_metric_value(baseline_metric)
        changed_metric = changed_metrics.get(stand_id)
        changed_value = get_metric_value(changed_metric)
        if changed_value is None:
            changed_value = baseline_value

        results.append(
            {
                "stand_id": stand_id,
                "variable": metric.value,
                "year": year,
                "action": FUNDING_REPORT_ACTION,
                "aggregation": FUNDING_REPORT_AGGREGATION,
                "baseline": baseline_value,
                "value": changed_value,
                "delta": calculate_delta(changed_value, baseline_value),
                "forested_rate": get_forested_rate(changed_metric, stand_size),
            }
        )
    return results


def calculate_project_area_results(
    project_area: ProjectArea,
    stand_results_by_id: Dict[int, Dict[str, Any]],
    stand_size: str,
    metric: FundingReportMetric,
    year: int,
) -> Dict[str, Any]:
    project_stand_ids = list(
        project_area.get_stands(stand_size=stand_size).values_list("id", flat=True)
    )
    stand_results = [
        stand_results_by_id[stand_id]
        for stand_id in project_stand_ids
        if stand_id in stand_results_by_id
    ]
    baseline_sum = sum(result.get("baseline") or 0 for result in stand_results)
    changed_sum = sum(result.get("value") or 0 for result in stand_results)
    return {
        "project_area_id": project_area.pk,
        "variable": metric.value,
        "year": year,
        "action": FUNDING_REPORT_ACTION,
        "aggregation": FUNDING_REPORT_AGGREGATION,
        "baseline": baseline_sum,
        "value": changed_sum,
        "delta": calculate_delta(changed_sum, baseline_sum),
        "stand_count": len(stand_results),
    }


def get_forested_rate(
    metric: Optional[StandMetric], stand_size: str
) -> Optional[float]:
    if not metric:
        return None
    count = metric.count if metric.count else 0
    return float(count) / float(pixels_from_size(StandSizeChoices(stand_size)))


def calculate_metric_year_results(
    report: FundingOpportunityReport,
    metric: FundingReportMetric,
    year: int,
    stands: List[Stand],
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    baseline_layer = get_funding_report_datalayer(
        metric=metric,
        year=year,
        baseline=True,
    )
    changed_layer = get_funding_report_datalayer(
        metric=metric,
        year=year,
        baseline=False,
    )

    stand_ids = [stand.pk for stand in stands]
    baseline_metrics = {
        metric.stand_id: metric
        for metric in StandMetric.objects.filter(
            stand_id__in=stand_ids,
            datalayer=baseline_layer,
        )
    }
    changed_metrics = {
        metric.stand_id: metric
        for metric in StandMetric.objects.filter(
            stand_id__in=stand_ids,
            datalayer=changed_layer,
        )
    }

    stand_results = calculate_stand_results(
        baseline_metrics=baseline_metrics,
        changed_metrics=changed_metrics,
        metric=metric,
        year=year,
        stand_size=report.scenario.get_stand_size(),
    )
    stand_results_by_id = {result["stand_id"]: result for result in stand_results}
    stand_size = report.scenario.get_stand_size()
    project_area_results = [
        calculate_project_area_results(
            project_area=project_area,
            stand_results_by_id=stand_results_by_id,
            stand_size=stand_size,
            metric=metric,
            year=year,
        )
        for project_area in report.scenario.project_areas.all()
    ]

    return stand_results, project_area_results


def calculate_funding_opportunity_report(
    report: FundingOpportunityReport,
) -> Dict[str, Any]:
    report = FundingOpportunityReport.objects.select_related("scenario").get(
        pk=report.pk
    )
    stand_size = report.scenario.get_stand_size()
    stands = list(report.scenario.get_project_areas_stands(stand_size=stand_size))

    results: Dict[str, Any] = {
        "stand_size": stand_size,
        "stand_results": [],
        "project_area_results": [],
    }
    for metric in FundingReportMetric:
        for year in FUNDING_REPORT_YEARS:
            stand_results, project_area_results = calculate_metric_year_results(
                report=report,
                metric=metric,
                year=year,
                stands=stands,
            )
            results["stand_results"].extend(stand_results)
            results["project_area_results"].extend(project_area_results)

    report.results = results
    report.save(update_fields=["results", "updated_at"])
    return results
