import logging
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, mixins, permissions, pagination
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from drf_spectacular.utils import extend_schema, extend_schema_view
from planscape.serializers import BaseErrorMessageSerializer
from planning.filters import (
    PlanningAreaFilter,
    ScenarioFilter,
    PlanningAreaOrderingFilter,
    ScenarioOrderingFilter,
    ProjectAreaNoteFilterSet,
)
from planning.models import PlanningArea, ProjectArea, ProjectAreaNote, Scenario
from planning.permissions import (
    PlanningAreaViewPermission,
    ScenarioViewPermission,
    ProjectAreaNoteViewPermission,
)
from planning.serializers import (
    CreatePlanningAreaSerializer,
    CreateScenarioSerializer,
    ListCreatorSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    PlanningAreaSerializer,
    ProjectAreaNoteSerializer,
    ProjectAreaNoteListSerializer,
    ProjectAreaNoteCreateSerializer,
    ProjectAreaSerializer,
    ScenarioSerializer,
    ScenarioAndProjectAreasSerializer,
    ProjectAreaSerializer,
    ScenarioSerializer,
    ListCreatorSerializer,
    UploadedScenarioDataSerializer,
)
from planning.services import (
    create_planning_area,
    create_scenario,
    delete_planning_area,
    delete_scenario,
    toggle_scenario_status,
    create_projectarea_note,
    create_scenario_from_upload,
)

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
        "create": CreateScenarioSerializer,
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
        out_serializer = ScenarioSerializer(instance=scenario)
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
    queryset = ProjectArea.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = ProjectAreaSerializer
    serializer_classes = {
        "retrieve": ProjectAreaSerializer,
    }


class ProjectAreaNoteViewSet(viewsets.ModelViewSet):
    queryset = ProjectAreaNote.objects.all()
    serializer_class = ProjectAreaNoteSerializer
    permission_classes = [ProjectAreaNoteViewPermission]
    serializer_classes = {
        "list": ProjectAreaNoteListSerializer,
        "create": ProjectAreaNoteCreateSerializer,
    }
    filterset_class = ProjectAreaNoteFilterSet
    filter_backends = [DjangoFilterBackend]

    def get_serializer_class(self):
        return (
            self.serializer_classes.get(self.action, self.serializer_class)
            or self.serializer_class
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        project_area_id = self.kwargs.get("project_area_id")
        if project_area_id is None:
            raise ValueError("project_area_id is required")
        return self.queryset.filter(project_area_id=project_area_id)
