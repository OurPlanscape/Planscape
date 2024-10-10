from rest_framework.routers import SimpleRouter

from datasets.views import AdminDataLayerViewSet

router = SimpleRouter()
router.register(
    "datalayers",
    AdminDataLayerViewSet,
    basename="datalayers",
)
