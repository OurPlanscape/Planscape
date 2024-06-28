from planning.views_v2 import PlanningAreaViewSet, ScenarioViewSet, CreatorViewSet
from rest_framework import routers

router = routers.SimpleRouter()
router.register(r"planningareas", PlanningAreaViewSet, basename="planningareas")

router.register(r"creators", CreatorViewSet, basename="creators")

router.register(
    r"planningareas/(?P<planningarea_pk>\d+)/scenarios",
    ScenarioViewSet,
    basename="scenarios",
)
