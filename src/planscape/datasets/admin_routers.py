from rest_framework.routers import SimpleRouter

from datasets.admin_views import AdminDataLayerViewSet, AdminDatasetViewSet

router = SimpleRouter()
router.register(
    "datasets",
    AdminDatasetViewSet,
    basename="datasets",
)
router.register(
    "datalayers",
    AdminDataLayerViewSet,
    basename="datalayers",
)
