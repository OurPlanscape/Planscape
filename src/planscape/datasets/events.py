from typing import Any, Optional

from realtime.events import get_actor_id, publish_workspace_event
from workspaces.models import Workspace

from datasets.models import DataLayer
from datasets.serializers import BrowseDataLayerSerializer


def datalayer_object(datalayer_id: int) -> dict[str, Any]:
    return {"kind": "datalayer", "id": int(datalayer_id)}


def serialize_favorite_datalayer(datalayer_id: int) -> Optional[dict[str, Any]]:
    """Same shape as browsing the workspace's favorites."""
    datalayer = (
        DataLayer.objects.select_related("organization", "dataset", "category")
        .prefetch_related("simple_categories", "styles")
        .filter(pk=datalayer_id)
        .first()
    )
    if datalayer is None:
        return None
    return BrowseDataLayerSerializer(
        datalayer,
        context={"favorite_datalayer_ids": {datalayer.pk}},
    ).data


def publish_datalayer_favorited(
    workspace: Workspace,
    datalayer: DataLayer,
    *,
    actor: Any = None,
) -> None:
    datalayer_id = datalayer.pk
    publish_workspace_event(
        workspace.pk,
        "datasets.datalayer.favorited",
        obj=datalayer_object(datalayer_id),
        data=lambda: serialize_favorite_datalayer(datalayer_id),
        actor_id=get_actor_id(actor),
    )


def publish_datalayer_unfavorited(
    workspace: Workspace,
    datalayer_id: int,
    *,
    actor: Any = None,
) -> None:
    publish_workspace_event(
        workspace.pk,
        "datasets.datalayer.unfavorited",
        obj=datalayer_object(datalayer_id),
        actor_id=get_actor_id(actor),
    )


DATALAYER_CREATED = "datasets.datalayer.created"
DATALAYER_STATUS_CHANGED = "datasets.datalayer.status_changed"
DATALAYER_DELETED = "datasets.datalayer.deleted"
DATALAYER_UPDATED = "datasets.datalayer.updated"
DATALAYER_UPLOAD_EVENTS = (
    DATALAYER_CREATED,
    DATALAYER_STATUS_CHANGED,
    DATALAYER_DELETED,
    DATALAYER_UPDATED,
)


def serialize_upload_status(datalayer: DataLayer) -> dict[str, Any]:
    return {
        "name": datalayer.name,
        "status": datalayer.status,
        "failure_reason": datalayer.failure_reason,
        "created_by": datalayer.created_by_id,
    }


def publish_upload_event(
    event_type: str,
    datalayer: DataLayer,
    *,
    actor: Any = None,
) -> None:
    publish_workspace_event(
        datalayer.workspace_id,
        event_type,
        obj=datalayer_object(datalayer.pk),
        data=serialize_upload_status(datalayer),
        actor_id=get_actor_id(actor),
    )
