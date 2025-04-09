from typing import Any, Dict, Optional

from django.conf import settings
from openpanel import OpenPanel

from planscape.singleton import Singleton


class SingleOpenPanel(metaclass=Singleton):
    """Wrapper class to OpenPanel main class.
    Just so we can instantiate this once.
    """

    def __init__(self):
        self.op = OpenPanel(
            client_id=settings.OPENPANEL_CLIENT_ID,
            client_secret=settings.OPENPANEL_CLIENT_SECRET,
            api_url=settings.OPENPANEL_URL,
            disabled=settings.TESTING_MODE is True,
        )
        self.op.set_global_properties(
            {"environment": settings.ENV, "testing": settings.TESTING_MODE}
        )

    def track(self, name: str, properties: Optional[Dict[str, Any]] = None):
        self.op.track(name=name, properties=properties)

    def identify(self, profile_id: str, traits: Optional[Dict[str, Any]] = None):
        self.op.identify(profile_id=profile_id, traits=traits)  # type: ignore
