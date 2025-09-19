from rest_framework.routers import SimpleRouter
from climate_foresight.views import ClimateForesightViewSet

router = SimpleRouter()
router.register(
    r"climate-foresight", ClimateForesightViewSet, basename="climateforesight"
)
