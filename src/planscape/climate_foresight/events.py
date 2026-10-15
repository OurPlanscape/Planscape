from typing import Any

from realtime.events import get_actor_id, publish_workspace_event

from climate_foresight.models import (
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
)


def run_object(run: ClimateForesightRun) -> dict[str, Any]:
    return {
        "kind": "climate_foresight_run",
        "id": run.pk,
        "planning_area_id": run.planning_area_id,
    }


def publish_run_event(
    event_type: str,
    run: ClimateForesightRun,
    *,
    actor: Any = None,
    **data: Any,
) -> None:
    """Callers that load the run fresh should `select_related("planning_area")`."""
    publish_workspace_event(
        run.planning_area.workspace_id,
        event_type,
        obj=run_object(run),
        data={"status": run.status, **data},
        actor_id=get_actor_id(actor),
    )


def publish_input_datalayer_event(
    input_datalayer: ClimateForesightRunInputDataLayer,
    *,
    actor: Any = None,
) -> None:
    run = input_datalayer.run
    publish_workspace_event(
        run.planning_area.workspace_id,
        "climate_foresight.input_datalayer.updated",
        obj={
            "kind": "climate_foresight_input_datalayer",
            "id": input_datalayer.pk,
            "run_id": run.pk,
            "planning_area_id": run.planning_area_id,
        },
        data={
            "status": input_datalayer.status,
            "has_statistics": input_datalayer.statistics is not None,
        },
        actor_id=get_actor_id(actor),
    )
