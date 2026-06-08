import logging
from typing import Any, Dict, List, Optional, Tuple

from datasets.models import DataLayer, DataLayerType
from planning.models import ProjectArea
from stands.calculator import calculate_delta
from stands.models import Stand, StandMetric

from funding_report.models import (
    FUNDING_REPORT_ACTION,
    FUNDING_REPORT_AGGREGATION,
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingReportMetric,
)

log = logging.getLogger(__name__)


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
                get_funding_report_datalayer(metric=metric, year=year, baseline=True)
            )
            datalayers.append(
                get_funding_report_datalayer(metric=metric, year=year, baseline=False)
            )
    return datalayers


def _build_datalayer_lookup() -> Dict[Tuple[str, int, bool], DataLayer]:
    lookup = {}
    for dl in DataLayer.objects.filter(
        type=DataLayerType.RASTER,
        metadata__contains={"modules": {"funding_report": {}}},
    ):
        fr_meta = dl.metadata["modules"]["funding_report"]
        key = (fr_meta["variable"], fr_meta["year"], fr_meta["baseline"])
        lookup[key] = dl
    return lookup


def get_metric_value(metric: Optional[StandMetric]) -> Optional[float]:
    if not metric:
        return None
    return metric.avg


def calculate_stand_results(
    baseline_metrics: Dict[int, StandMetric],
    changed_metrics: Dict[int, StandMetric],
    metric: FundingReportMetric,
    year: int,
) -> List[Dict[str, Any]]:
    if not baseline_metrics:
        log.warning(
            "No baseline metrics found for metric=%s year=%s; no stands will be included in results.",
            metric,
            year,
        )
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
            }
        )
    return results


def calculate_project_area_results(
    project_area: ProjectArea,
    stand_results_by_id: Dict[int, Dict[str, Any]],
    stand_ids: List[int],
    metric: FundingReportMetric,
    year: int,
) -> Dict[str, Any]:
    stand_results = [
        stand_results_by_id[stand_id]
        for stand_id in stand_ids
        if stand_id in stand_results_by_id
    ]
    all_baselines = [result.get("baseline") for result in stand_results]
    all_changed = [result.get("value") for result in stand_results]
    baseline_sum = (
        None
        if all(v is None for v in all_baselines)
        else sum(v or 0 for v in all_baselines)
    )
    changed_sum = (
        None
        if all(v is None for v in all_changed)
        else sum(v or 0 for v in all_changed)
    )
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


def calculate_metric_year_results(
    report: FundingOpportunityReport,
    metric: FundingReportMetric,
    year: int,
    stands: List[Stand],
    project_areas: List[ProjectArea],
    project_area_stand_ids: Dict[int, List[int]],
    datalayer_lookup: Dict[Tuple[str, int, bool], DataLayer],
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    baseline_layer = datalayer_lookup[(metric.value, year, True)]
    changed_layer = datalayer_lookup[(metric.value, year, False)]

    stand_ids = [stand.pk for stand in stands]
    baseline_metrics = {
        sm.stand_id: sm
        for sm in StandMetric.objects.filter(
            stand_id__in=stand_ids,
            datalayer=baseline_layer,
        )
    }
    changed_metrics = {
        sm.stand_id: sm
        for sm in StandMetric.objects.filter(
            stand_id__in=stand_ids,
            datalayer=changed_layer,
        )
    }

    missing_count = len(stand_ids) - len(baseline_metrics)
    if missing_count > 0:
        log.warning(
            "%d stands have no baseline metric for metric=%s year=%s and will be excluded from results.",
            missing_count,
            metric,
            year,
        )

    stand_results = calculate_stand_results(
        baseline_metrics=baseline_metrics,
        changed_metrics=changed_metrics,
        metric=metric,
        year=year,
    )
    stand_results_by_id = {result["stand_id"]: result for result in stand_results}
    project_area_results = [
        calculate_project_area_results(
            project_area=project_area,
            stand_results_by_id=stand_results_by_id,
            stand_ids=project_area_stand_ids[project_area.pk],
            metric=metric,
            year=year,
        )
        for project_area in project_areas
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
    project_areas = list(report.scenario.project_areas.all())
    project_area_stand_ids = {
        pa.pk: list(pa.get_stands(stand_size=stand_size).values_list("id", flat=True))
        for pa in project_areas
    }
    datalayer_lookup = _build_datalayer_lookup()

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
                project_areas=project_areas,
                project_area_stand_ids=project_area_stand_ids,
                datalayer_lookup=datalayer_lookup,
            )
            results["stand_results"].extend(stand_results)
            results["project_area_results"].extend(project_area_results)

    report.results = results
    report.save(update_fields=["results", "updated_at"])
    return results
