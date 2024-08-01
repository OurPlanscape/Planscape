import logging
from django.contrib.auth import get_user_model
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
    ScenarioOrderingFilter,
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

User = get_user_model()
logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    # this member is configured for instrospection and swagger automcatic generation
    queryset = PlanningArea.objects.none()
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
        qs = PlanningArea.objects.list_for_api(user=user)
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

    @action(methods=["POST"], detail=True)
    def upload_shapefiles(self, request, pk=None):
        print(f"here is the pk: {pk}")
        uploaded_geom = {**request.data["geometry"]}
        pa = PlanningArea.objects.get(pk=pk)

        # Ensure that planning area contains the uploaded geometry
        if not is_inside(pa.geometry, uploaded_geom):
            return Response(
                {"error": "Uploaded geometry is not contained by planning area"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # now we create a scenario
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


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.none()
    permission_classes = [ScenarioViewPermission]
    ordering_fields = [
        "name",
        "created_at",
        "id",
        "status",
        "budget",
        "acres",
        "completed_at",
    ]
    serializer_class = ScenarioSerializer
    serializer_classes = {
        "list": ListScenarioSerializer,
    }
    # TODO: acres, budget, status, completion date?
    filterset_class = ScenarioFilter
    filter_backends = [ScenarioOrderingFilter]

    def get_queryset(self):
        user = self.request.user
        qs = Scenario.objects.list_by_user(user=user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
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
        return (
            self.serializer_classes.get(self.action, self.serializer_class)
            or self.serializer_class
        )

    @action(methods=["post"], detail=True)
    def toggle_status(self, request, pk=None):
        scenario = self.get_object()
        toggle_scenario_status(scenario, self.request.user)
        serializer = ScenarioSerializer(instance=scenario)
        return Response(data=serializer.data)


# TODO: migrate this to an action inside the planning area viewset
class CreatorViewSet(ReadOnlyModelViewSet):
    queryset = User.objects.none()
    permission_classes = [PlanningAreaViewPermission]
    serializer_class = ListCreatorSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        pas = PlanningArea.objects.list_by_user(user=user).values_list("id", flat=True)
        return User.objects.filter(planning_areas__id__in=pas).distinct()


class ProjectAreaViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = ProjectArea.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = ProjectAreaSerializer
    serializer_classes = {
        "retrieve": ProjectAreaSerializer,
    }
