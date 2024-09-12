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
        filters=[],
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
                "Treatment Prescription Action description",
                value={
                    "SINGLE": {
                        "MODERATE_THINNING_BIOMASS": "Moderate Thinning & Biomass Removal",
                        "HEAVY_THINNING_BIOMASS": "Heavy Thinning & Biomass Removal",
                        "MODERATE_THINNING_BURN": "Moderate Thinning & Pile Burn",
                        "HEAVY_THINNING_BURN": "Heavy Thinning & Pile Burn",
                        "MODERATE_MASTICATION": "Moderate Mastication",
                        "HEAVY_MASTICATION": "Heavy Mastication",
                        "RX_FIRE": "Prescribed Fire",
                        "HEAVY_THINNING_RX_FIRE": "Heavy Thinning & Prescribed Fire",
                        "MASTICATION_RX_FIRE": "Mastication & Prescribed Fire",
                    },
                    "SEQUENCE": {
                        "MODERATE_THINNING_BURN_PLUS_RX_FIRE": "Moderate Thinning & Pile Burn (year 0), Prescribed Burn (year 10)",
                        "MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN": "Moderate Thinning & Pile Burn (year 0), Moderate Thinning & Pile Burn (year 10)",
                        "HEAVY_THINNING_BURN_PLUS_RX_FIRE": "Heavy Thinning & Pile Burn (year 0), Prescribed Burn (year 10)",
                        "HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN": "Heavy Thinning & Pile Burn (year 0), Heavy Thinning & Pile Burn (year 10)",
                        "RX_FIRE_PLUS_RX_FIRE": "Prescribed Fire (year 0), Prescribed Fire (year 10)",
                        "MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION": "Moderate Mastication (year 0), Moderate Mastication (year 10)",
                        "HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE": "Heavy Thinning & Biomass Removal (year 0), Prescribed Fire (year 10)",
                        "MODERATE_MASTICATION_PLUS_RX_FIRE": "Moderate Mastication (year 0), Prescribed Fire (year 10)",
                    },
                },
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
