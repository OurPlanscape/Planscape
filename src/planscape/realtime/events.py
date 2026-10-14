"""
Publishing events to workspace channels.

Every event is fanned out to exactly one channel-layer group,
`workspace.<id>`, which is what `WorkspaceConsumer` joins. This module
imports no models on purpose so that any app (services and Celery tasks
alike) can import it without creating import cycles.
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

log = logging.getLogger(__name__)

GROUP_PREFIX = "workspace"
# `type` of the channel-layer message; Channels dispatches it to
# `WorkspaceConsumer.workspace_event`. The domain event lives under "event".
CHANNEL_MESSAGE_TYPE = "workspace.event"


def workspace_group_name(workspace_id: int) -> str:
    return f"{GROUP_PREFIX}.{int(workspace_id)}"


def to_plain(value: Any) -> Any:
    """Converts enums, dates and other rich values into msgpack/JSON-safe ones."""
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        # TextChoices are str subclasses; msgpack and json want plain str.
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, dict):
        return {str(key): to_plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_plain(item) for item in value]
    return str(value)


def build_event(
    workspace_id: int,
    event_type: str,
    *,
    obj: dict[str, Any],
    data: Optional[dict[str, Any]] = None,
    actor_id: Optional[int] = None,
) -> dict[str, Any]:
    return {
        "type": event_type,
        "workspace_id": int(workspace_id),
        "object": to_plain(obj),
        "data": to_plain(data or {}),
        "actor_id": actor_id,
        "timestamp": timezone.now().isoformat(),
    }


def publish_workspace_event(
    workspace_id: Optional[int],
    event_type: str,
    *,
    obj: dict[str, Any],
    data: Optional[dict[str, Any]] = None,
    actor_id: Optional[int] = None,
) -> None:
    """
    Sends `event_type` to every client connected to the workspace.

    No-op when `workspace_id` is None (legacy planning areas without a
    workspace). The send happens after the current transaction commits, so
    clients that refetch on the event see the committed state; outside a
    transaction it happens right away. It never raises: losing an event must
    not break the request or task that produced it.
    """
    if workspace_id is None:
        return
    event = build_event(
        workspace_id,
        event_type,
        obj=obj,
        data=data,
        actor_id=actor_id,
    )
    transaction.on_commit(lambda: _send(event))


def _send(event: dict[str, Any]) -> None:
    group = workspace_group_name(event["workspace_id"])
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            group,
            {"type": CHANNEL_MESSAGE_TYPE, "event": event},
        )
    except Exception:
        log.exception("Failed to publish %s to %s", event["type"], group)


def get_actor_id(user: Any) -> Optional[int]:
    """Primary key of the user that caused the event, or None (system/anonymous)."""
    return getattr(user, "pk", None)
