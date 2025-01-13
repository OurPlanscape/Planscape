from rest_framework.routers import SimpleRouter

from impacts.views import (
    TreatmentPlanViewSet,
    TreatmentPrescriptionViewSet,
    TreatmentPlanNoteViewSet
)

router = SimpleRouter()
router.register(
    "treatment_plans",
    TreatmentPlanViewSet,
    basename="tx-plans",
)

router.register(
    "treatment_plans/(?P<tx_plan_pk>\d+)/treatment_prescriptions",
    TreatmentPrescriptionViewSet,
    basename="tx-prescriptions",
)

router.register(
    "treatment_plans/(?P<tx_plan_pk>\d+)/note",
    TreatmentPlanNoteViewSet,
    basename="tx-plan-notes",
)

