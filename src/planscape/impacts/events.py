from typing import Any

from realtime.events import get_actor_id, publish_workspace_event

from impacts.models import TreatmentPlan


def treatment_plan_object(treatment_plan: TreatmentPlan) -> dict[str, Any]:
    scenario = treatment_plan.scenario
    return {
        "kind": "treatment_plan",
        "id": treatment_plan.pk,
        "scenario_id": scenario.pk,
        "planning_area_id": scenario.planning_area_id,
    }


def publish_treatment_plan_event(
    event_type: str,
    treatment_plan: TreatmentPlan,
    *,
    actor: Any = None,
    **data: Any,
) -> None:
    """Callers that load the plan fresh should
    `select_related("scenario__planning_area")`."""
    publish_workspace_event(
        treatment_plan.scenario.planning_area.workspace_id,
        event_type,
        obj=treatment_plan_object(treatment_plan),
        data={"status": treatment_plan.status, **data},
        actor_id=get_actor_id(actor),
    )
