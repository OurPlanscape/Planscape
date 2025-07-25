import logging

from core.serializers import MultiSerializerMixin
from django.contrib.auth import get_user_model
from django.db.models.expressions import RawSQL
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, pagination, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from planning.filters import (
    PlanningAreaFilter,
    PlanningAreaOrderingFilter,
    ScenarioFilter,
    ScenarioOrderingFilter,
)
from planning.models import PlanningArea, ProjectArea, Scenario, TreatmentGoal
from planning.permissions import PlanningAreaViewPermission, ScenarioViewPermission
from planning.serializers import (
    CreatePlanningAreaSerializer,
    CreateScenarioV2Serializer,
    ListCreatorSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    PlanningAreaSerializer,
    ProjectAreaSerializer,
    ScenarioAndProjectAreasSerializer,
    ScenarioSerializer,
    ScenarioV2Serializer,
    TreatmentGoalSerializer,
    UploadedScenarioDataSerializer,
)
from planning.services import (
    create_planning_area,
    create_scenario,
    create_scenario_from_upload,
    delete_planning_area,
    delete_scenario,
    toggle_scenario_status,
)
from planscape.serializers import BaseErrorMessageSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(description="List Planning Area."),
    retrieve=extend_schema(
        description="Detail a Planning Area.",
        responses={200: PlanningAreaSerializer, 404: BaseErrorMessageSerializer},
    ),
    destroy=extend_schema(
        description="Delete a Planning Area.",
        responses={204: None, 404: BaseErrorMessageSerializer},
    ),
    update=extend_schema(
        description="Update Planning Area.",
        responses={200: PlanningAreaSerializer, 404: BaseErrorMessageSerializer},
    ),
    partial_update=extend_schema(
        description="Update Planning Area.",
        responses={200: PlanningAreaSerializer, 404: BaseErrorMessageSerializer},
    ),
)
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
    serializer_class = PlanningAreaSerializer
    serializer_classes = {
        "create": CreatePlanningAreaSerializer,
        "list": ListPlanningAreaSerializer,
        "retrieve": PlanningAreaSerializer,
    }
    pagination_class = pagination.LimitOffsetPagination
    filterset_class = PlanningAreaFilter
    filter_backends = [
        DjangoFilterBackend,
        PlanningAreaOrderingFilter,
        OrderingFilter,
    ]

    def get_serializer_class(self):
        return (
            self.serializer_classes.get(self.action, self.serializer_class)
            or self.serializer_class
        )

    def get_queryset(self):
        user = self.request.user
        qs = PlanningArea.objects.list_for_api(user=user).select_related("user")
        return qs

    @extend_schema(description="Create Planning Area.")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        planning_area = create_planning_area(**serializer.validated_data)
        out_serializer = PlanningAreaSerializer(
            instance=planning_area,
            context={
                "request": request,
            },
        )
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_destroy(self, instance):
        delete_planning_area(
            user=self.request.user,
            planning_area=instance,
        )


@extend_schema_view(
    list=extend_schema(description="List Scenarios."),
    retrieve=extend_schema(
        description="Detail a Scenario.",
        responses={200: ScenarioSerializer, 404: BaseErrorMessageSerializer},
    ),
    destroy=extend_schema(
        description="Delete a Scenario.",
        responses={204: None, 404: BaseErrorMessageSerializer},
    ),
    update=extend_schema(
        description="Update Scenario.",
        responses={200: ScenarioSerializer, 404: BaseErrorMessageSerializer},
    ),
    partial_update=extend_schema(
        description="Update Scenario.",
        responses={200: ScenarioSerializer, 404: BaseErrorMessageSerializer},
    ),
    create=extend_schema(
        description=(
            "Create a Scenario. "
            "In the `configuration` JSON, users can include a `seed` (integer) "
            "to make ForSys runs reproducible."
        ),
        responses={
            201: ScenarioSerializer,
            400: BaseErrorMessageSerializer,
        },
    ),
)
class ScenarioViewSet(MultiSerializerMixin, viewsets.ModelViewSet):
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
        "create": CreateScenarioV2Serializer,
        "retrieve": ScenarioV2Serializer,
    }
    filterset_class = ScenarioFilter
    filter_backends = [
        DjangoFilterBackend,
        ScenarioOrderingFilter,
    ]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Scenario.objects.list_by_user(user=user)
            .select_related(
                "planning_area",
                "user",
            )
            .prefetch_related("project_areas")
        )
        return qs

    @extend_schema(description="Create a Scenario.")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = create_scenario(
            **serializer.validated_data,
        )
        out_serializer = ScenarioV2Serializer(instance=scenario)

        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
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

    @extend_schema(description="Toggle status of a Scenario.")
    @action(methods=["post"], detail=True)
    def toggle_status(self, request, pk=None):
        scenario = self.get_object()
        toggle_scenario_status(scenario, self.request.user)
        serializer = ScenarioSerializer(instance=scenario)
        return Response(data=serializer.data)

    @action(methods=["POST"], detail=False)
    def upload_shapefiles(self, request, pk=None, *args, **kwargs):
        serializer = UploadedScenarioDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_scenario = create_scenario_from_upload(
            validated_data=serializer.validated_data,
            user=request.user,
        )
        out_serializer = ScenarioAndProjectAreasSerializer(instance=new_scenario)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
        )


# TODO: migrate this to an action inside the planning area viewset
@extend_schema_view(
    list=extend_schema(description="List creators of Planning Areas."),
    retrieve=extend_schema(description="Retrieve the creator of a Planning Areas."),
)
class CreatorViewSet(ReadOnlyModelViewSet):
    queryset = User.objects.none()
    permission_classes = [PlanningAreaViewPermission]
    serializer_class = ListCreatorSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        pas = PlanningArea.objects.list_by_user(user=user).values_list("id", flat=True)
        return User.objects.filter(planning_areas__id__in=pas).distinct()


@extend_schema_view(
    retrieve=extend_schema(description="Project Area of a Planning Areas.")
)
class ProjectAreaViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = (
        ProjectArea.objects.all()
        .annotate(
            treatment_rank=RawSQL("COALESCE((data->>'treatment_rank')::int, 1)", [])
        )
        .order_by("treatment_rank")
    )
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = ProjectAreaSerializer
    serializer_classes = {
        "retrieve": ProjectAreaSerializer,
    }


@extend_schema_view(
    list=extend_schema(description="List Treatment Goals."),
    retrieve=extend_schema(description="Detail Treatment Goal."),
)
class TreatmentGoalViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    A viewset for viewing and editing TreatmentGoal instances.
    """

    queryset = TreatmentGoal.objects.filter(active=True)
    serializer_class = TreatmentGoalSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ["category", "name"]
    ordering = ["category", "name"]
