from django.urls import path, include
from rest_framework.routers import DefaultRouter
from climate_foresight.views import ClimateForesightRunViewSet

app_name = "climate_foresight"

router = DefaultRouter()
router.register(
    r"climate-foresight-runs",
    ClimateForesightRunViewSet,
    basename="climateforesightruns",
)

urlpatterns = [
    path("", include(router.urls)),
]
