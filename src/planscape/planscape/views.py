from rest_framework import status
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response
from impacts.models import TreatmentPrescriptionAction


class LookupViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    lookups = {
        "treatment_prescription_action": TreatmentPrescriptionAction,
    }

    def get_queryset(self):
        return self.lookups

    def list(self, request, *args):
        return Response(self.lookups.keys())

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
