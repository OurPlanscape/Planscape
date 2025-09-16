from typing import Any, Dict, Optional, Union

from django.contrib.auth.models import User
from openpanel import OpenPanel


def get_openpanel(user_id: Optional[str] = None) -> Optional[OpenPanel]:
    from django.conf import settings

    if settings.TESTING_MODE:
        return None
    if not settings.OPENPANEL_URL:
        return None
    if not settings.OPENPANEL_CLIENT:
        return None
    op = settings.OPENPANEL_CLIENT

    if user_id is not None:
        op.profile_id = user_id
    return op


def get_domain(email: str) -> str:
    handle, domain = email.split("@")
    return domain


def track_openpanel(
    name: str,
    properties: Optional[Dict[str, Any]] = None,
    user_id: Optional[Union[str, int]] = None,
) -> None:
    op = get_openpanel(user_id=str(user_id))
    if op:
        if properties:
            email = properties.pop("email", None) or None
            if email:
                domain = get_domain(email)
                properties["domain"] = domain
        op.track(name=name, properties=properties)


def identify_openpanel(user: User) -> None:
    profile_id = str(user.pk)
    op = get_openpanel()
    if op:
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
