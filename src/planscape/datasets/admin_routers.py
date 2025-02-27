from rest_framework.routers import SimpleRouter

from datasets.admin_views import (
    AdminDataLayerViewSet,
    AdminDatasetViewSet,
    AdminStyleViewSet,
)

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
router.register(
    "styles",
    AdminStyleViewSet,
    basename="styles",
)
