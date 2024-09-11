from rest_framework import status
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample
from impacts.models import TreatmentPrescriptionAction

from planscape.serializers import (
    LookupKeysSerializer,
    TreatmentPrescriptionActionSerializer,
)


class LookupViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    lookups = {
        "treatment_prescription_action": TreatmentPrescriptionAction,
    }

    def get_queryset(self):
        return self.lookups

    @extend_schema(
        description="List lookup fields.",
        responses={
            200: LookupKeysSerializer,
        },
        examples=[OpenApiExample("Simple list", value="treatment_prescription_action")],
    )
    def list(self, request, *args):
        return Response(self.lookups.keys())

    @extend_schema(
        description="Lookup fields details",
        responses={200: TreatmentPrescriptionActionSerializer, 404: None},
        examples=[
            OpenApiExample(
                "TPA description",
                value={"SINGLE": {"foo": "bar"}, "SEQUENCE": {"foo": "bar"}},
            )
        ],
    )
    def retrieve(self, request, pk=None):
        lookup_class = self.lookups.get(pk, None) or None
        if not lookup_class:
            return Response(status=status.HTTP_404_NOT_FOUND)

        data = (
            lookup_class.json()
            if hasattr(lookup_class, "json")
            else dict(lookup_class.choices())
        )

        return Response(data=data)
