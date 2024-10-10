from rest_framework.routers import SimpleRouter

from datasets.views import AdminDataLayerViewSet, AdminDatasetViewSet

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
