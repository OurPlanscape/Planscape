from typing import Any, Optional

from realtime.events import get_actor_id, publish_workspace_event

from planning.models import PlanningArea, Scenario, ScenarioVersion


def planning_area_object(planning_area: PlanningArea) -> dict[str, Any]:
    return {"kind": "planning_area", "id": planning_area.pk}


def scenario_object(scenario: Scenario) -> dict[str, Any]:
    return {
        "kind": "scenario",
        "id": scenario.pk,
        "planning_area_id": scenario.planning_area_id,
    }


def serialize_planning_area(planning_area_id: int) -> Optional[dict[str, Any]]:
    # planning.serializers imports planning.services, which imports this module
    from planning.serializers import RealtimePlanningAreaSerializer

    planning_area = (
        PlanningArea.objects.select_related("user").filter(pk=planning_area_id).first()
    )
    if planning_area is None:
        return None
    return RealtimePlanningAreaSerializer(planning_area).data


def serialize_scenario(scenario_id: int) -> Optional[dict[str, Any]]:
    """Same shape as retrieving the scenario, without the project area GeoJSON."""
    # planning.serializers imports planning.services, which imports this module
    from planning.serializers import ScenarioV2Serializer, ScenarioV3Serializer

    scenario = (
        Scenario.objects.select_related("planning_area", "treatment_goal", "results")
        .filter(pk=scenario_id)
        .first()
    )
    if scenario is None:
        return None
    serializer_class = (
        ScenarioV3Serializer
        if scenario.version == ScenarioVersion.V3
        else ScenarioV2Serializer
    )
    return serializer_class(scenario, context={"exclude_result": True}).data


def publish_planning_area_event(
    event_type: str,
    planning_area: PlanningArea,
    *,
    actor: Any = None,
) -> None:
    """Sends the planning area as the API serializes it, read after commit."""
    planning_area_id = planning_area.pk
    publish_workspace_event(
        planning_area.workspace_id,
        event_type,
        obj=planning_area_object(planning_area),
        data=lambda: serialize_planning_area(planning_area_id),
        actor_id=get_actor_id(actor),
    )


def publish_planning_area_deleted(
    planning_area: PlanningArea,
    *,
    actor: Any = None,
) -> None:
    publish_workspace_event(
        planning_area.workspace_id,
        "planning.planning_area.deleted",
        obj=planning_area_object(planning_area),
        actor_id=get_actor_id(actor),
    )


def publish_scenario_event(
    event_type: str,
    scenario: Scenario,
    *,
    actor: Any = None,
) -> None:
    """
    Sends the scenario as the API serializes it, read after commit. Callers
    that load the scenario fresh should `select_related("planning_area")`.
    """
    scenario_id = scenario.pk
    publish_workspace_event(
        scenario.planning_area.workspace_id,
        event_type,
        obj=scenario_object(scenario),
        data=lambda: serialize_scenario(scenario_id),
        actor_id=get_actor_id(actor),
    )


def publish_scenario_deleted(scenario: Scenario, *, actor: Any = None) -> None:
    publish_workspace_event(
        scenario.planning_area.workspace_id,
        "planning.scenario.deleted",
        obj=scenario_object(scenario),
        actor_id=get_actor_id(actor),
    )
