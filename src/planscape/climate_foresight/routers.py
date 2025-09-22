from rest_framework.routers import SimpleRouter
from climate_foresight.views import ClimateForesightRunViewSet

router = SimpleRouter()
router.register(
    r"climate-foresight-runs",
    ClimateForesightRunViewSet,
    basename="climateforesightruns",
)
