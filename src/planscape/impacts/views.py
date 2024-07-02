from rest_framework import mixins, viewsets, response, status
from impacts.models import TreatmentPlan, TreatmentPrescription
from impacts.serializers import (
    CreateTreatmentPlanSerializer,
    TreatmentPlanListSerializer,
    TreatmentPlanSerializer,
    TreatmentPrescriptionSerializer,
    TreatmentPrescriptionListSerializer,
)
from impacts.services import create_treatment_plan


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
        "create": CreateTreatmentPlanSerializer,
        "retrieve": TreatmentPlanSerializer,
    }

    def get_serializer_class(self):
        try:
            return self.serializer_classes[self.action]
        except KeyError:
            return self.serializer_class

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        out_serializer = TreatmentPlanSerializer(instance=serializer.instance)
        return response.Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        serializer.instance = create_treatment_plan(
            **serializer.validated_data,
        )


class TreatmentPrescriptionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = TreatmentPrescription.objects.all()
    serializer_class = TreatmentPrescriptionSerializer
    serializer_classes = {
        "list": TreatmentPrescriptionListSerializer,
        "create": TreatmentPrescriptionSerializer,
        "retrieve": TreatmentPrescriptionSerializer,
    }

    def get_serializer_class(self):
        try:
            return self.serializer_classes[self.action]
        except KeyError:
            return self.serializer_class

    def get_queryset(self):
        tx_plan_pk = self.kwargs.get("tx_plan_pk")
        if tx_plan_pk:
            try:
                tx_prescriptions = TreatmentPrescription.objects.filter(
                    treatment_plan_id=tx_plan_pk,
                )
                return tx_prescriptions
            except TreatmentPrescription.DoesNotExist:
                return TreatmentPrescription.objects.none()
        else:
            return TreatmentPrescription.objects.none()
