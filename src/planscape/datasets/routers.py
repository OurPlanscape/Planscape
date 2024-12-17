from rest_framework.routers import SimpleRouter

from datasets.views import DatasetViewSet, DataLayerViewSet

router = SimpleRouter()
router.register(
    "datasets",
    DatasetViewSet,
    basename="datasets",
)
router.register(
    "datalayers",
    DataLayerViewSet,
    basename="datalayers",
)
