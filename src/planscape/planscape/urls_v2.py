from django.urls import path, include
from projects.routers import router as projects_router
from metrics.routers import router as metrics_router
from goals.routers import router as goals_router
from planning.routers import router as planning_router
from impacts.routers import router as impacts_router

app_name = "api"
urlpatterns = [
    path("", include((projects_router.urls, "projects"), namespace="projects")),
    path("", include((metrics_router.urls, "metrics"), namespace="metrics")),
    path("", include((goals_router.urls, "goals"), namespace="goals")),
    path("", include((planning_router.urls, "planning"), namespace="planning")),
    path("", include((impacts_router.urls, "impacts"), namespace="impacts")),
]
