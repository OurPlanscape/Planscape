import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, mixins, permissions
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from impacts.models import TreatmentPlan
from impacts.serializers import TreatmentPlanListSerializer
from planning.filters import (
    PlanningAreaFilter,
    ScenarioFilter,
    PlanningAreaOrderingFilter,
)
from planning.geometry import is_inside
from planning.models import PlanningArea, ProjectArea, Scenario, User
from planning.permissions import PlanningAreaViewPermission, ScenarioViewPermission
from planning.serializers import (
    PlanningAreaSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    ScenarioProjectAreasSerializer,
    ProjectAreaSerializer,
    ScenarioSerializer,
    ListCreatorSerializer,
)
from planning.services import (
    create_planning_area,
    create_scenario,
    delete_planning_area,
    delete_scenario,
    toggle_scenario_status,
    create_scenario_from_upload,
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
        "latest_updated",
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
        return Scenario.objects.filter(planning_area__pk=planningarea_pk)

    @action(methods=["post"], detail=True)
    def toggle_status(self, request, planningarea_pk, pk=None):
        scenario = self.get_object()
        toggle_scenario_status(scenario, self.request.user)
        serializer = ScenarioSerializer(instance=scenario)
        return Response(data=serializer.data)

    @action(methods=["get"], detail=True)
    def treatment_plans(self, request, planningarea_pk, pk=None):
        scenario = self.get_object()
        treatments = TreatmentPlan.objects.filter(scenario_id=scenario)
        paginator = LimitOffsetPagination()
        # Paginate the queryset
        page = paginator.paginate_queryset(treatments, request)
        if page is not None:
            serializer = TreatmentPlanListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = TreatmentPlanListSerializer(treatments, many=True)
        return Response(serializer.data)

    @action(methods=["post"], detail=False)
    def upload_shapefile(self, request, planningarea_pk):
        uploaded_geom = {**request.data["geometry"]}
        pa = PlanningArea.objects.get(pk=planningarea_pk)

        # Ensure that planning area contains the uploaded geometry
        if not is_inside(pa.geometry, uploaded_geom):
            return Response(
                {"error": "Uploaded geometry is not contained by planning area"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # so now we create a scenario
        scenario = create_scenario_from_upload(
            user=self.request.user,
            planningarea=pa,
            scenario_name=request.data["name"],
            stand_size=request.data["stand_size"],
            uploaded_geom=uploaded_geom,
        )
        out_serializer = ScenarioProjectAreasSerializer(instance=scenario)
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


# TODO: migrate this to an action inside the planning area viewset
class CreatorViewSet(ReadOnlyModelViewSet):
    queryset = User.objects.none()
    permission_classes = [PlanningAreaViewPermission]
    serializer_class = ListCreatorSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        return User.objects.filter(
            planning_areas__in=PlanningArea.objects.get_for_user(user)
        ).distinct()


class ProjectAreaViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = ProjectArea.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = ProjectAreaSerializer
    serializer_classes = {
        "retrieve": ProjectAreaSerializer,
    }
