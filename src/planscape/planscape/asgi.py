"""
ASGI config for planscape project.

HTTP is served by Django and WebSockets by Channels from the same process.
See docs/setup_planscape_locally.md for the WebSocket client contract.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planscape.settings")

# Must run before importing anything that touches models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import OriginValidator  # noqa: E402
from django.conf import settings  # noqa: E402
from realtime.middleware import JWTAuthMiddleware  # noqa: E402
from realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": OriginValidator(
            JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
            settings.WEBSOCKET_ALLOWED_ORIGINS,
        ),
    }
)
