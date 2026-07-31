import logging
from typing import Any, Dict, Optional, Union

from core.tasks import track, track_mixpanel
from django.conf import settings
from django.contrib.auth.models import User

log = logging.getLogger(__name__)


def get_domain(email: str) -> str:
    handle, domain = email.split("@")
    return domain


def _dispatch(
    openpanel_payload: Dict[str, Any], mixpanel_payload: Dict[str, Any]
) -> None:
    if settings.TESTING_MODE:
        return
    track.delay(payload=openpanel_payload)  # type: ignore
    track_mixpanel.delay(payload=mixpanel_payload)  # type: ignore


def track_openpanel(
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
    log.info(f"tracking openpanel event {name}")
    _dispatch(
        openpanel_payload={
            "type": "track",
            "payload": {
                "name": name,
                "profileId": str(user_id) if user_id else None,
                "properties": properties,
            },
        },
        mixpanel_payload={
            "type": "track",
            "payload": {
                "distinct_id": distinct_id,
                "event_name": name,
                "properties": properties,
            },
        },
    )


def identify_openpanel(user: User) -> None:
    distinct_id = str(user.pk)
    shared_properties = {
        "organization": None,
        "last_login": user.last_login,
    }
    _dispatch(
        openpanel_payload={
            "type": "identify",
            "payload": {
                "profileId": distinct_id,
                "traits": {
                    "firstName": user.first_name,
                    "lastName": user.last_name,
                    "email": user.email,
                },
                "properties": shared_properties,
            },
        },
        mixpanel_payload={
            "type": "identify",
            "payload": {
                "distinct_id": distinct_id,
                "properties": {
                    "$first_name": user.first_name,
                    "$last_name": user.last_name,
                    "$email": user.email,
                    **shared_properties,
                },
            },
        },
    )
