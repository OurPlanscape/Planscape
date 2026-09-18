from typing import Any

from realtime.events import get_actor_id, publish_workspace_event

from planning.models import PlanningArea, Scenario


def planning_area_object(planning_area: PlanningArea) -> dict[str, Any]:
    return {"kind": "planning_area", "id": planning_area.pk}


def scenario_object(scenario: Scenario) -> dict[str, Any]:
    return {
        "kind": "scenario",
        "id": scenario.pk,
        "planning_area_id": scenario.planning_area_id,
    }


def publish_planning_area_event(
    event_type: str,
    planning_area: PlanningArea,
    *,
    actor: Any = None,
    **data: Any,
) -> None:
    publish_workspace_event(
        planning_area.workspace_id,
        event_type,
        obj=planning_area_object(planning_area),
        data={
            "map_status": planning_area.map_status,
            "stands_ready_at": planning_area.stands_ready_at,
            "metrics_ready_at": planning_area.metrics_ready_at,
            **data,
        },
        actor_id=get_actor_id(actor),
    )


def publish_scenario_event(
    event_type: str,
    scenario: Scenario,
    *,
    actor: Any = None,
    **data: Any,
) -> None:
    """Callers that load the scenario fresh should `select_related("planning_area")`."""
    publish_workspace_event(
        scenario.planning_area.workspace_id,
        event_type,
        obj=scenario_object(scenario),
        data={
            "status": scenario.status,
            "result_status": scenario.result_status,
            "post_process_status": scenario.post_process_status,
            "geopackage_status": scenario.geopackage_status,
            **data,
        },
        actor_id=get_actor_id(actor),
    )
