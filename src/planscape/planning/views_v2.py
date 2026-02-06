import logging

from core.serializers import MultiSerializerMixin
from django.contrib.auth import get_user_model
from django.db.models.expressions import RawSQL
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from planscape.serializers import BaseErrorMessageSerializer
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
    TreatmentGoalFilter,
)
from planning.models import (
    PlanningArea,
    ProjectArea,
    Scenario,
    ScenarioResultStatus,
    ScenarioType,
    ScenarioVersion,
    TreatmentGoal,
)
from planning.permissions import PlanningAreaViewPermission, ScenarioViewPermission
from planning.serializers import (
    AvailableStandsSerializer,
    CreatePlanningAreaSerializer,
    CreateScenarioV2Serializer,
    GetAvailableStandsSerializer,
    ListCreatorSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    PatchScenarioV3Serializer,
    PlanningAreaSerializer,
    ProjectAreaSerializer,
    ScenarioAndProjectAreasSerializer,
    ScenarioSerializer,
    ScenarioV2Serializer,
    ScenarioV3Serializer,
    TreatmentGoalSerializer,
    UpdatePlanningAreaSerializer,
    UploadedScenarioDataSerializer,
    UpsertConfigurationV2Serializer,
    UpsertScenarioV3Serializer,
)
from planning.services import (
    create_config,
    create_planning_area,
    create_scenario,
    create_scenario_from_upload,
    delete_planning_area,
    delete_scenario,
    get_available_stands,
    toggle_scenario_status,
    trigger_scenario_run,
    validate_scenario_configuration,
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
        "update": UpdatePlanningAreaSerializer,
        "partial_update": UpdatePlanningAreaSerializer,
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

    def perform_update(self, serializer):
        instance = self.get_object()
        instance.updated_at = timezone.now()
        instance.save(update_fields=["updated_at"])
        super().perform_update(serializer)

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

    @action(methods=["POST"], detail=True)
    def available_stands(self, request, pk=None):
        planning_area = self.get_object()
        serializer = GetAvailableStandsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = get_available_stands(planning_area, **serializer.validated_data)
        out_serializer = AvailableStandsSerializer(instance=result)
        return Response(
            out_serializer.data,
            status=status.HTTP_200_OK,
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
        "partial_update": UpsertScenarioV3Serializer,
        "create_draft": UpsertScenarioV3Serializer,
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

    @extend_schema(description="Retrieve a Scenario (auto-detects version).")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        version = getattr(instance, "version", None)
        if version == ScenarioVersion.V3:
            serializer = ScenarioV3Serializer(instance, context={"request": request})
        else:
            serializer = ScenarioV2Serializer(instance, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(description="Create a Scenario.")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = create_scenario(**serializer.validated_data)

        out_serializer = ScenarioV2Serializer(instance=scenario)

        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @action(detail=False, methods=["post"], url_path="draft")
    def create_draft(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario_type = serializer.validated_data.get("type") or ScenarioType.PRESET
        configuration_data = create_config(
            targets=serializer.validated_data.get("targets") or {},
            constraints=[],
            included_areas=[],
            excluded_areas=[],
            priorities=[],
            cobenefits=[],
        )
        validated_data = {
            **serializer.validated_data,
            "configuration": configuration_data,
            "type": scenario_type,
        }
        scenario = create_scenario(**validated_data)

        if hasattr(scenario, "result_status"):
            scenario.results.status = ScenarioResultStatus.DRAFT
            scenario.results.save()
            scenario.refresh_from_db()

        out_serializer = ScenarioV3Serializer(instance=scenario)

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

    @extend_schema(description="Update Scenario's configuration.")
    @action(methods=["patch"], detail=True, url_path="configuration", serializer_class=UpsertConfigurationV2Serializer)
    def patch_configuration(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UpsertConfigurationV2Serializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        response_serializer = ScenarioV2Serializer(instance)
        planning_area = instance.planning_area
        planning_area.updated_at = timezone.now()
        planning_area.save(update_fields=["updated_at"])
        return Response(response_serializer.data)

    @action(methods=["patch"], detail=True, url_path="draft")
    def patch_draft(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = PatchScenarioV3Serializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        configuration_data = serializer.validated_data.get("configuration")
        if configuration_data:
            existing = instance.configuration or {}
            incoming_config = create_config(
                stand_size=configuration_data.get("stand_size"),
                targets=configuration_data.get("targets") or {},
                constraints=configuration_data.get("constraints") or [],
                included_areas=configuration_data.get("included_areas_ids") or [],
                excluded_areas=configuration_data.get("excluded_areas_ids") or [],
                priorities=configuration_data.get("priority_objectives") or [],
                cobenefits=configuration_data.get("cobenefits") or [],
                seed=configuration_data.get("seed"),
                planning_approach=configuration_data.get("planning_approach"),
                sub_units_layer=configuration_data.get("sub_units_layer"),
            )
            updated_config = dict(existing)
            for key in configuration_data.keys():
                updated_config[key] = incoming_config.get(key)
            serializer.validated_data["configuration"] = updated_config
        self.perform_update(serializer)
        response_serializer = ScenarioV3Serializer(instance)
        planning_area = instance.planning_area
        planning_area.updated_at = timezone.now()
        planning_area.save(update_fields=["updated_at"])
        return Response(response_serializer.data)

    @extend_schema(description="Trigger a ForSys run for this Scenario (V3 rules).")
    @action(methods=["post"], detail=True, url_path="run")
    def run(self, request, pk=None):
        scenario = self.get_object()
        if hasattr(scenario, "results"):
            scenario.results.status = ScenarioResultStatus.PENDING
            scenario.results.save()

        errors = validate_scenario_configuration(scenario)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # trigger
        trigger_scenario_run(scenario, request.user)

        serializer = ScenarioV3Serializer(instance=scenario)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)


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
    filterset_class = TreatmentGoalFilter
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ["category", "name"]
    ordering = ["category", "name"]
