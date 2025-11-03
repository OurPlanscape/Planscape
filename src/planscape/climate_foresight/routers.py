from rest_framework.routers import SimpleRouter
from climate_foresight.views import (
    ClimateForesightPillarViewSet,
    ClimateForesightRunViewSet,
)

router = SimpleRouter()
router.register(
    r"climate-foresight-runs",
    ClimateForesightRunViewSet,
    basename="climateforesightruns",
)
router.register(
    r"climate-foresight-pillars",
    ClimateForesightPillarViewSet,
    basename="climateforesightpillars",
)
