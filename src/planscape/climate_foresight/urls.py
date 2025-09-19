from django.urls import path, include
from rest_framework.routers import DefaultRouter
from climate_foresight.views import ClimateForesightViewSet

app_name = "climate_foresight"

router = DefaultRouter()
router.register(
    r"climate-foresight", ClimateForesightViewSet, basename="climateforesight"
)

urlpatterns = [
    path("", include(router.urls)),
]
