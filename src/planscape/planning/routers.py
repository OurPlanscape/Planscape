from planning.views_v2 import (
    PlanningAreaViewSet,
    ScenarioViewSet,
    CreatorViewSet,
    ProjectAreaViewSet,
)
from rest_framework import routers

router = routers.SimpleRouter()
router.register(
    r"planningareas/creators",
    CreatorViewSet,
    basename="creators",
)
router.register(
    r"planningareas",
    PlanningAreaViewSet,
    basename="planningareas",
)
router.register(
    r"scenarios",
    ScenarioViewSet,
    basename="scenarios",
)

router.register("project-areas", ProjectAreaViewSet, basename="project-areas")
