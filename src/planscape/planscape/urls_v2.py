from django.urls import path, include
from rest_framework.routers import SimpleRouter
from planning.routers import router as planning_router
from impacts.routers import router as impacts_router
from datasets.routers import router as datasets_router
from planscape.views import LookupViewSet

core_router = SimpleRouter()
core_router.register("lookups", LookupViewSet, basename="lookups")

app_name = "api"
urlpatterns = [
    path("", include((planning_router.urls, "planning"), namespace="planning")),
    path("", include((impacts_router.urls, "impacts"), namespace="impacts")),
    path("", include((core_router.urls, "core"), namespace="core")),
    path("", include((datasets_router.urls, "datasets"), namespace="admin-datasets")),
]
