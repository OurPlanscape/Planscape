import logging

from rest_framework import viewsets

from planning.models import PlanningArea
from planning.serializers import PlanningAreaSerializer, ListPlanningAreaSerializer
from planning.filters import PlanningAreaFilter
from planning.permission import UserPermission
from rest_framework.filters import OrderingFilter

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()
    permission_classes = [UserPermission]
    ordering_fields = ["name", "created_at", "scenario_count"]
    filterset_class = [PlanningAreaFilter]
    filter_backends = [OrderingFilter]

    def get_serializer_class(self):
        if self.action == "list":
            return ListPlanningAreaSerializer
        return PlanningAreaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PlanningArea.objects.get_for_user(user)
        return qs
