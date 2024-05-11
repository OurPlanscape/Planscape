import logging
import json
from rest_framework import viewsets
from rest_framework.response import Response

from planning.models import PlanningArea, Scenario
from planning.serializers import (
    PlanningAreaSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    ScenarioSerializer,
    CreatePlanningAreaSerializer,
)
from planning.geometry import coerce_geojson, coerce_geometry

from planning.filters import PlanningAreaFilter, ScenarioFilter
from planning.permission import PlanningAreaViewPermission, ScenarioViewPermission
from base.region_name import display_name_to_region

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()
    permission_classes = [PlanningAreaViewPermission]
    ordering_fields = ["name", "created_at", "scenario_count"]
    filterset_class = PlanningAreaFilter

    def create(self, request):
        try:
            body = json.loads(request.body)
            request_data = request.data
            request_data["user"] = request.user.pk
            request_data["geometry"] = coerce_geojson(body.get("geometry"))
            request_data["region_name"] = display_name_to_region(
                body.get("region_name")
            ).value
            serializer = self.get_serializer(data=request_data)
            serializer.is_valid(raise_exception=True)

            self.perform_create(serializer)

            # serializer.save()

            return Response(serializer.data)
        except Exception as e:
            logger.exception(e)
            return Response(status=400)

    def get_serializer_class(self):
        if self.action == "list":
            return ListPlanningAreaSerializer
        if self.action == "create":
            return CreatePlanningAreaSerializer
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

    def create(self, request, planningarea_pk):
        request_data = request.data
        request_data["planning_area"] = planningarea_pk
        serializer = self.get_serializer(data=request_data)
        serializer.is_valid(raise_exception=True)
        return super().create(request)

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
