from typing import Any, Optional

from realtime.events import get_actor_id, publish_workspace_event

from workspaces.models import Workspace


def workspace_object(workspace: Workspace) -> dict[str, Any]:
    return {"kind": "workspace", "id": workspace.pk}


def publish_workspace_deleted(workspace: Workspace, *, actor: Any = None) -> None:
    publish_workspace_event(
        workspace.pk,
        "workspace.workspace.deleted",
        obj=workspace_object(workspace),
        data={"workspace_id": workspace.pk},
        actor_id=get_actor_id(actor),
    )


def publish_member_event(
    event_type: str,
    workspace: Workspace,
    *,
    user_id: int,
    role: Optional[str] = None,
    actor: Any = None,
) -> None:
    data: dict[str, Any] = {"user_id": int(user_id)}
    if role is not None:
        data["role"] = role
    publish_workspace_event(
        workspace.pk,
        event_type,
        obj=workspace_object(workspace),
        data=data,
        actor_id=get_actor_id(actor),
    )
