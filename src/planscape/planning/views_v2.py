import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.filters import OrderingFilter
from rest_framework.decorators import action
from planning.models import PlanningArea, Scenario, User
from planning.filters import (
    PlanningAreaFilter,
    ScenarioFilter,
    PlanningAreaOrderingFilter,
)
from planning.models import PlanningArea, Scenario, ScenarioStatus
from planning.permissions import PlanningAreaViewPermission, ScenarioViewPermission
from planning.serializers import (
    PlanningAreaSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    ScenarioSerializer,
    ListPlanningAreaCreatorSerializer,
)
from planning.services import (
    create_planning_area,
    create_scenario,
    delete_planning_area,
    delete_scenario,
    toggle_scenario_status,
)

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()

    permission_classes = [PlanningAreaViewPermission]
    ordering_fields = [
        "area_acres",
        "created_at",
        "creator",
        "full_name",
        "name",
        "region_name",
        "scenario_count",
        "updated_at",
        "user",
    ]
    filterset_class = PlanningAreaFilter
    filter_backends = [
        DjangoFilterBackend,
        PlanningAreaOrderingFilter,
        OrderingFilter,
    ]

    def get_serializer_class(self):
        if self.action == "list":
            return ListPlanningAreaSerializer
        return PlanningAreaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PlanningArea.objects.get_list_for_user(user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = {
            "user": request.user,
            **serializer.validated_data,
        }
        planning_area = create_planning_area(**data)
        out_serializer = PlanningAreaSerializer(instance=planning_area)
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_destroy(self, instance):
        delete_planning_area(
            user=self.request.user,
            planning_area=instance,
        )


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.all()
    permission_classes = [ScenarioViewPermission]
    ordering_fields = ["name", "created_at"]
    filterset_class = ScenarioFilter

    def create(self, request, planningarea_pk):
        input_data = {
            "planning_area": planningarea_pk,
            **request.data,
        }
        serializer = self.get_serializer(data=input_data)
        serializer.is_valid(raise_exception=True)
        scenario = create_scenario(
            user=self.request.user,
            **serializer.validated_data,
        )
        out_serializer = ScenarioSerializer(instance=scenario)
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_destroy(self, instance):
        delete_scenario(
            user=self.request.user,
            scenario=instance,
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ListScenarioSerializer
        return ScenarioSerializer

    def get_queryset(self):
        planningarea_pk = self.kwargs.get("planningarea_pk")
        if planningarea_pk:
            try:
                scenarios = Scenario.objects.filter(
                    planning_area__pk=planningarea_pk,
                )
                return scenarios
            except PlanningArea.DoesNotExist:
                return Scenario.objects.none()  # Return an empty queryset
        else:
            return Scenario.objects.none()
        
class CreatorViewSet(ReadOnlyModelViewSet):
    queryset = User.objects.none()
    serializer_class = ListPlanningAreaCreatorSerializer

    def get_queryset(self):
        return User.objects.filter(planning_areas__isnull=False).distinct()
    @action(methods=["post"], detail=True)
    def toggle_status(self, request, planningarea_pk, pk=None):
        scenario = self.get_object()
        toggle_scenario_status(scenario, self.request.user)
        serializer = ScenarioSerializer(instance=scenario)
        return Response(data=serializer.data)
