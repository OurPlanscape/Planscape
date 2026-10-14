from datasets.views import DataLayerViewSet, DatasetViewSet, SimpleCategoryViewSet
from rest_framework.routers import SimpleRouter

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
router.register(
    "categories",
    SimpleCategoryViewSet,
    basename="categories",
)
