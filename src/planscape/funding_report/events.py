from typing import Any

from realtime.events import get_actor_id, publish_workspace_event

from funding_report.models import FundingOpportunityReport

STATUS_CHANGED_EVENT = "funding_report.report.status_changed"


def report_object(
    report_id: int,
    scenario_id: int,
    planning_area_id: int,
) -> dict[str, Any]:
    return {
        "kind": "funding_report",
        "id": report_id,
        "scenario_id": scenario_id,
        "planning_area_id": planning_area_id,
    }


def publish_report_event(
    event_type: str,
    report: FundingOpportunityReport,
    *,
    actor: Any = None,
    **data: Any,
) -> None:
    """Callers that load the report fresh should
    `select_related("scenario__planning_area")`."""
    scenario = report.scenario
    publish_workspace_event(
        scenario.planning_area.workspace_id,
        event_type,
        obj=report_object(report.pk, scenario.pk, scenario.planning_area_id),
        data={
            "status": report.status,
            "geopackage_status": report.geopackage_status,
            **data,
        },
        actor_id=get_actor_id(actor),
    )


def publish_report_status_by_id(report_id: int, status: str) -> None:
    """For writers that use `QuerySet.update()` and have no instance at hand."""
    row = (
        FundingOpportunityReport.objects.filter(pk=report_id)
        .values_list(
            "scenario_id",
            "scenario__planning_area_id",
            "scenario__planning_area__workspace_id",
        )
        .first()
    )
    if row is None:
        return
    scenario_id, planning_area_id, workspace_id = row
    publish_workspace_event(
        workspace_id,
        STATUS_CHANGED_EVENT,
        obj=report_object(report_id, scenario_id, planning_area_id),
        data={"status": status},
    )
