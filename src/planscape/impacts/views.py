from rest_framework import mixins, viewsets

from impacts.models import TreatmentPlan
from impacts.serializers import (
    CreateTreatmentPlanSerializer,
    TreatmentPlanListSerializer,
    TreatmentPlanSerializer,
)


class TreatmentPlanViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = TreatmentPlan.objects.all()
    serializer_class = TreatmentPlanSerializer
    serializer_classes = {
        "list": TreatmentPlanListSerializer,
        "created": CreateTreatmentPlanSerializer,
        "retrieve": TreatmentPlanSerializer,
    }

    def get_serializer_class(self):
        try:
            return self.serializer_classes[self.action]
        except KeyError:
            return self.serializer_class
