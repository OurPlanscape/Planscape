from rest_framework.routers import SimpleRouter

from metrics.views import MetricsViewSet

router = SimpleRouter()
router.register("metrics", MetricsViewSet, basename="metrics")
