import logging

from rest_framework import viewsets

from planning.models import PlanningArea, Scenario
from planning.serializers import (
    PlanningAreaSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    ScenarioSerializer,
)
from collaboration.permissions import PlanningAreaPermission
from planning.filters import PlanningAreaFilter, ScenarioFilter
from planning.permission import PlanningAreaViewPermission, ScenarioViewPermission

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()
    permission_classes = [PlanningAreaViewPermission]
    ordering_fields = ["name", "created_at", "scenario_count"]
    filterset_class = PlanningAreaFilter

    def get_serializer_class(self):
        if self.action == "list":
            return ListPlanningAreaSerializer
        return PlanningAreaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PlanningArea.objects.get_for_user(user)
        return qs


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.all()
    permission_classes = [ScenarioViewPermission]
    ordering_fields = ["name", "created_at"]
    filterset_class = ScenarioFilter

    def perform_create(self, serializer):
        planningarea_pk = self.kwargs.get("planningarea_pk")
        user = self.request.user
        planning_area = PlanningArea.objects.get(pk=planningarea_pk)
        if PlanningAreaPermission.can_add_scenario(user, planning_area):
            serializer.save(planningarea_pk=planning_area.pk)

    def get_serializer_class(self):
        if self.action == "list":
            return ListScenarioSerializer
        return ScenarioSerializer

    def get_queryset(self):
        planningarea_pk = self.kwargs.get("planningarea_pk")
        if planningarea_pk:
            try:
                scenarios = Scenario.objects.filter(planning_area__pk=planningarea_pk)
                return scenarios
            except PlanningArea.DoesNotExist:
                return Scenario.objects.none()  # Return an empty queryset
        else:
            return Scenario.objects.none()
