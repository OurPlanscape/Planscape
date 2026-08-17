import logging
from typing import Any, Dict, Optional, Union

from core.tasks import track_mixpanel
from django.conf import settings
from django.contrib.auth.models import User

log = logging.getLogger(__name__)


def get_domain(email: str) -> str:
    handle, domain = email.split("@")
    return domain


def _dispatch(payload: Dict[str, Any]) -> None:
    if settings.TESTING_MODE:
        return
    track_mixpanel.delay(payload=payload)  # type: ignore


def track_event(
    name: str,
    properties: Optional[Dict[str, Any]] = None,
    user_id: Optional[Union[str, int]] = None,
) -> None:
    properties = properties or {}
    email = properties.pop("email", None) or None
    if email:
        domain = get_domain(email)
        properties["domain"] = domain

    distinct_id = str(user_id) if user_id else "anonymous"
    log.info(f"tracking event {name}")
    _dispatch(
        payload={
            "type": "track",
            "payload": {
                "distinct_id": distinct_id,
                "event_name": name,
                "properties": properties,
            },
        },
    )


def identify_user(user: User) -> None:
    distinct_id = str(user.pk)
    _dispatch(
        payload={
            "type": "identify",
            "payload": {
                "distinct_id": distinct_id,
                "properties": {
                    "$first_name": user.first_name,
                    "$last_name": user.last_name,
                    "$email": user.email,
                    "organization": None,
                    "last_login": user.last_login,
                },
            },
        },
    )
