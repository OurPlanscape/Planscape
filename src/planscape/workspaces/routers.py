from rest_framework.routers import SimpleRouter

from workspaces.views import WorkspaceViewSet

router = SimpleRouter()
router.register(
    "workspaces",
    WorkspaceViewSet,
    basename="workspaces",
)
