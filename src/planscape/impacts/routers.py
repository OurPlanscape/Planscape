from rest_framework.routers import SimpleRouter

from impacts.views import TreatmentPlanViewSet

router = SimpleRouter()
router.register(
    "treatment_plans",
    TreatmentPlanViewSet,
    basename="tx-plans",
)
