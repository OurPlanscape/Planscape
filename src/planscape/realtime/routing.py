from django.urls import path

from realtime.consumers import WorkspaceConsumer

websocket_urlpatterns = [
    path(
        "planscape-backend/ws/workspaces/<int:workspace_id>/",
        WorkspaceConsumer.as_asgi(),
    ),
]
