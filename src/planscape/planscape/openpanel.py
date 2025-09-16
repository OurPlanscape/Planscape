import logging
from typing import Any, Dict, Optional, Union

from django.contrib.auth.models import User
from openpanel import OpenPanel

log = logging.getLogger(__name__)


def get_openpanel(user_id: Optional[Union[str, int]] = None) -> Optional[OpenPanel]:
    from django.conf import settings

    op = settings.OPENPANEL_CLIENT
    log.info(f"We have OpenPanel client {op}")
    if user_id is not None:
        op.profile_id = str(user_id)
    return op


def get_domain(email: str) -> str:
    handle, domain = email.split("@")
    return domain


def track_openpanel(
    name: str,
    properties: Optional[Dict[str, Any]] = None,
    user_id: Optional[Union[str, int]] = None,
) -> None:
    op = get_openpanel(user_id=user_id)
    if op:
        log.info("openpanel client available for tracking.")
        if properties:
            email = properties.pop("email", None) or None
            if email:
                domain = get_domain(email)
                properties["domain"] = domain

        log.info(f"tracking openpanel event {name} {properties}.")
        log.info(f"openpanel {op.disabled} {op.filter}.")
        op.track(name=name, properties=properties)


def identify_openpanel(user: User) -> None:
    profile_id = str(user.pk)
    op = get_openpanel()
    if op:
        log.info("openpanel client available for identify.")
        traits = {
            "firstName": user.first_name,
            "lastName": user.last_name,
            "email": user.email,
            "properties": {
                "organization": None,
                "last_login": user.last_login,
            },
        }
        op.identify(profile_id=profile_id, traits=traits)
