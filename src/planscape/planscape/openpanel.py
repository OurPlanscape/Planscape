from typing import Any, Dict, Optional, Union

from django.conf import settings
from django.contrib.auth.models import User
from openpanel import OpenPanel


def get_openpanel(user_id: Optional[str] = None) -> Optional[OpenPanel]:
    if settings.TESTING_MODE:
        return None
    if not settings.OPENPANEL_URL:
        return None
    op = OpenPanel(
        client_id=settings.OPENPANEL_CLIENT_ID,
        client_secret=settings.OPENPANEL_CLIENT_SECRET,
        api_url=settings.OPENPANEL_URL,
    )
    op.set_global_properties({"environment": settings.ENV})
    if user_id is not None:
        op.profile_id = user_id
    return op


def track_openpanel(
    name: str,
    properties: Optional[Dict[str, Any]] = None,
    user_id: Optional[Union[str, int]] = None,
) -> None:
    op = get_openpanel(user_id=str(user_id))
    if op:
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
