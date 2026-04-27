from rest_framework.routers import SimpleRouter

from workspaces.admin_views import AdminWorkspaceViewSet

router = SimpleRouter()
router.register(
    "workspaces",
    AdminWorkspaceViewSet,
    basename="workspaces",
)
