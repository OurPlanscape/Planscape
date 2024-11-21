from planning.views_v2 import (
    PlanningAreaViewSet,
    ProjectAreaNoteViewSet,
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
router.register(
    "project-areas/(?P<project_area_id>\d+)/note",
    ProjectAreaNoteViewSet,
    basename="project-areas-notes",
)
