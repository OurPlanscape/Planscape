import logging
from typing import Any, Dict, Optional, Union

from core.tasks import track
from django.conf import settings
from django.contrib.auth.models import User

log = logging.getLogger(__name__)


def get_domain(email: str) -> str:
    handle, domain = email.split("@")
    return domain


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

    payload = {
        "type": "track",
        "payload": {
            "name": name,
            "profileId": str(user_id) if user_id else None,
            "properties": properties,
        },
    }
    log.info(f"tracking openpanel event {name}")
    if not settings.TESTING_MODE:
        track.delay(payload=payload)  # type: ignore


def identify_openpanel(user: User) -> None:
    payload = {
        "type": "identify",
        "payload": {
            "profileId": str(user.pk),
            "traits": {
                "firstName": user.first_name,
                "lastName": user.last_name,
                "email": user.email,
            },
            "properties": {
                "organizatio": None,
                "last_login": user.last_login,
            },
        },
    }
    if not settings.TESTING_MODE:
        track.delay(payload=payload)
