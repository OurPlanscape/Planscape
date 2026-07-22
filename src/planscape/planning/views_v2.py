import logging

from core.serializers import MultiSerializerMixin
from datasets.models import DataLayer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from funding_report.models import (
    FundingOpportunityReport,
    FundingOpportunityReportInvite,
    FundingOpportunityReportRun,
    FundingOpportunityReportStatus,
    FundingOpportunityReportSharedLink,
)
from funding_report.openapi_examples import (
    FLAME_LENGTH_REDUCTION_RESPONSE_EXAMPLE,
    FUNDING_OPPORTUNITY_REPORT_RESPONSE_EXAMPLE,
)
from funding_report.serializers import (
    FundingOpportunityReportInviteSharedLinkRequestSerializer,
    FundingOpportunityReportInviteSharedLinkResponseSerializer,
    FundingOpportunityReportPublicUrlResponseSerializer,
    FundingOpportunityReportSerializer,
    FundingOpportunityReportSharedLinkQuerySerializer,
    FundingReportAETImprovementRequestSerializer,
    FundingReportAETImprovementResponseSerializer,
    FundingReportFlameLengthReductionRequestSerializer,
    FundingReportFlameLengthReductionResponseSerializer,
)
from funding_report.services import (
    calculate_aet_improvement,
    calculate_funding_report_flame_length_reduction,
)
from funding_report.tasks import (
    run_funding_opportunity_report,
    send_funding_opportunity_report_shared_link,
)
from modules.base import compute_scenario_capabilities
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
    SubUnitsDetailsParamsSerializer,
    TreatmentGoalSerializer,
    UpdatePlanningAreaSerializer,
    UploadedScenarioDataSerializer,
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
    get_sub_units_details,
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
class ScenarioViewSet(
    MultiSerializerMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
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
        draft_status = Q(result_status=ScenarioResultStatus.DRAFT) | Q(
            results__status=ScenarioResultStatus.DRAFT
        )

        qs = (
            Scenario.objects.list_by_user(user=user)
            .filter(Q(user=user) | ~draft_status)
            .select_related(
                "planning_area",
                "user",
                "results",
            )
            .prefetch_related("project_areas")
        )
        if self.action == "list":
            qs = qs.filter(parent__isnull=True)
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

        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
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
        from planscape.exceptions import InvalidGeometry
        from rest_framework.exceptions import ValidationError as DRFValidationError

        serializer = UploadedScenarioDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            new_scenario = create_scenario_from_upload(
                validated_data=serializer.validated_data,
                user=request.user,
            )
        except (InvalidGeometry, ValueError) as e:
            raise DRFValidationError({"global": [str(e)]})
        out_serializer = ScenarioAndProjectAreasSerializer(instance=new_scenario)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
        )

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
                priorities=configuration_data.get("priorities") or [],
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
        instance.refresh_from_db()
        instance.capabilities = compute_scenario_capabilities(instance)
        instance.save(update_fields=["capabilities"])
        response_serializer = ScenarioV3Serializer(instance)
        planning_area = instance.planning_area
        planning_area.updated_at = timezone.now()
        planning_area.save(update_fields=["updated_at"])
        return Response(response_serializer.data)

    @extend_schema(
        description="Run a Scenario's funding opportunity report.",
        responses={202: FundingOpportunityReportSerializer},
        examples=[FUNDING_OPPORTUNITY_REPORT_RESPONSE_EXAMPLE],
    )
    @action(methods=["post"], detail=True, url_path="run-report")
    def run_report(self, request, pk=None):
        scenario = self.get_object()
        report, created = FundingOpportunityReport.objects.get_or_create(
            scenario=scenario,
            defaults={"created_by": request.user},
        )

        if not created and report.created_by_id != request.user.pk:
            report.created_by = request.user
            report.save(update_fields=["created_by", "updated_at"])

        FundingOpportunityReportRun.objects.create(
            report=report,
            user=request.user,
            email=request.user.email or "",
        )

        run_funding_opportunity_report.delay(report.pk)
        serializer = FundingOpportunityReportSerializer(instance=report)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(
        description="Get a Scenario's funding opportunity report.",
        responses={200: FundingOpportunityReportSerializer},
        examples=[FUNDING_OPPORTUNITY_REPORT_RESPONSE_EXAMPLE],
    )
    @action(methods=["get"], detail=True, url_path="get-report")
    def get_report(self, request, pk=None):
        scenario = self.get_object()
        report = get_object_or_404(FundingOpportunityReport, scenario=scenario)
        serializer = FundingOpportunityReportSerializer(instance=report)
        return Response(serializer.data)

    @extend_schema(
        description=(
            "Calculate the AET (Actual Evapotranspiration) improvement for a "
            "Scenario's funding report."
        ),
        request=FundingReportAETImprovementRequestSerializer,
        responses={
            200: FundingReportAETImprovementResponseSerializer,
            400: BaseErrorMessageSerializer,
            409: BaseErrorMessageSerializer,
        },
    )
    @action(methods=["post"], detail=True, url_path="aet-improvement")
    def aet_improvement(self, request, pk=None):
        scenario = self.get_object()
        serializer = FundingReportAETImprovementRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report = FundingOpportunityReport.objects.filter(scenario=scenario).first()
        if not report or report.status != FundingOpportunityReportStatus.SUCCESS:
            return Response(
                {
                    "detail": (
                        "AET improvement can only be calculated after the "
                        "funding report completes successfully."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            results = calculate_aet_improvement(
                report=report,
                percentage=serializer.validated_data["percentage"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(results)

    @extend_schema(
        description=(
            "Calculate the flame length reduction for a Scenario's funding "
            "report, given a 'from' and 'to' flame length interval in feet."
        ),
        request=FundingReportFlameLengthReductionRequestSerializer,
        responses={
            200: FundingReportFlameLengthReductionResponseSerializer,
            400: BaseErrorMessageSerializer,
            409: BaseErrorMessageSerializer,
        },
        examples=[FLAME_LENGTH_REDUCTION_RESPONSE_EXAMPLE],
    )
    @action(methods=["post"], detail=True, url_path="flame-length-reduction")
    def flame_length_reduction(self, request, pk=None):
        scenario = self.get_object()
        serializer = FundingReportFlameLengthReductionRequestSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        report = FundingOpportunityReport.objects.filter(scenario=scenario).first()
        if not report or report.status != FundingOpportunityReportStatus.SUCCESS:
            return Response(
                {
                    "detail": (
                        "Flame length reduction can only be calculated after "
                        "the funding report completes successfully."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            results = calculate_funding_report_flame_length_reduction(
                report=report,
                from_ft=serializer.validated_data["from_ft"],
                to_ft=serializer.validated_data["to_ft"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(results)

    @extend_schema(description="Trigger a ForSys run for this Scenario (V3 rules).")
    @action(methods=["post"], detail=True, url_path="run")
    def run(self, request, pk=None):
        scenario = self.get_object()

        errors = validate_scenario_configuration(scenario)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # trigger
        trigger_scenario_run(scenario, request.user)

        serializer = ScenarioV3Serializer(instance=scenario)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(
        description="Sub-Units areas details.",
        parameters=[
            OpenApiParameter(
                name="sub_units_layer",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Override the scenario's sub_units_layer with this DataLayer ID.",
            ),
            OpenApiParameter(
                name="sub_units_fixed_target",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Flag that determine the Sub-Units Prioritization target (false = percentage | true = fixed value).",
            ),
            OpenApiParameter(
                name="sub_units_target_value",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Absolute value or relative percent of project area sum.",
            ),
        ],
    )
    @action(methods=["GET"], detail=True, url_path="sub_units_details")
    def get_sub_units_details(self, request, pk=None):
        scenario = self.get_object()
        query_params_serializer = SubUnitsDetailsParamsSerializer(
            data=request.query_params
        )
        query_params_serializer.is_valid(raise_exception=True)

        datalayer_pk = query_params_serializer.validated_data.get(
            "sub_units_layer"
        ) or scenario.configuration.get("sub_units_layer")
        if not datalayer_pk:
            return Response(
                {"errors": "Sub-Unit layer not selected."},
                status=status.HTTP_412_PRECONDITION_FAILED,
            )

        sub_units_fixed_target = query_params_serializer.validated_data.get(
            "sub_units_fixed_target"
        )
        sub_units_target_value = query_params_serializer.validated_data.get(
            "sub_units_target_value"
        )

        datalayer = DataLayer.objects.get(pk=datalayer_pk)
        stand_size = scenario.get_stand_size()
        details = get_sub_units_details(
            scenario,
            stand_size,
            datalayer,
            sub_units_fixed_target,
            sub_units_target_value,
        )
        if not details:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(details, status=status.HTTP_200_OK)

    @extend_schema(description="List all Project Areas for a Scenario.")
    @action(methods=["get"], detail=True, url_path="project-areas")
    def project_areas(self, request, pk=None):
        scenario = self.get_object()
        queryset = scenario.project_areas.all()
        serializer = ProjectAreaSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        methods=["POST"], detail=True, serializer_class=GetAvailableStandsSerializer
    )
    def available_stands(self, request, pk=None):
        scenario = self.get_object()
        serializer = GetAvailableStandsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = get_available_stands(scenario, **serializer.validated_data)
        out_serializer = AvailableStandsSerializer(instance=result)
        return Response(
            out_serializer.data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        methods=["GET"],
        description="List funding opportunity report invite emails.",
        responses={200: FundingOpportunityReportInviteSharedLinkResponseSerializer},
    )
    @extend_schema(
        methods=["POST"],
        description=(
            "Create funding opportunity report invites for the submitted emails "
            "and send a shared report link."
        ),
        request=FundingOpportunityReportInviteSharedLinkRequestSerializer,
        responses={201: FundingOpportunityReportInviteSharedLinkResponseSerializer},
    )
    @action(methods=["GET", "POST"], detail=True, url_path="funding-report-invites")
    def create_funding_opportunity_report_invites(self, request, pk=None):
        scenario = self.get_object()
        report = get_object_or_404(FundingOpportunityReport, scenario=scenario)

        active_invites = FundingOpportunityReportInvite.objects.filter(
            report=report,
            deleted_at__isnull=True,
        )

        if request.method == "GET":
            emails = list(active_invites.values_list("invitee_email", flat=True))
            return Response({"emails": emails}, status=status.HTTP_200_OK)

        serializer = FundingOpportunityReportInviteSharedLinkRequestSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        emails = validated_data["emails"]
        configuration = {
            "aet": validated_data["aet"],
            "total_flame_severity": validated_data["total_flame_severity"],
        }

        User = get_user_model()
        with transaction.atomic():
            shared_link, _ = FundingOpportunityReportSharedLink.objects.get_or_create(
                report=report,
                configuration=configuration,
            )
            for email in emails:
                invite_exists = FundingOpportunityReportInvite.objects.filter(
                    report=report,
                    invitee_email=email,
                    deleted_at__isnull=True,
                ).exists()
                if invite_exists:
                    continue

                invitee = User.objects.filter(email__iexact=email).first()
                FundingOpportunityReportInvite.objects.create(
                    report=report,
                    inviter=request.user,
                    invitee_email=email,
                    invitee=invitee,
                )

        recipient_emails = emails
        if validated_data["resent_to_all_invitees"]:
            recipient_emails = emails + list(
                active_invites.values_list("invitee_email", flat=True)
            )
            recipient_emails = list(dict.fromkeys(recipient_emails))

        public_url = shared_link.get_public_url()
        inviter_name = request.user.get_full_name() or request.user.email
        for email in recipient_emails:
            send_funding_opportunity_report_shared_link.delay(
                email,
                public_url,
                inviter_name,
                scenario.name,
            )

        return Response({"emails": emails}, status=status.HTTP_201_CREATED)

    @extend_schema(
        parameters=[FundingOpportunityReportSharedLinkQuerySerializer],
        responses={200: FundingOpportunityReportPublicUrlResponseSerializer},
    )
    @action(methods=["GET"], detail=True, url_path="funding-report-public-url")
    def funding_opportunity_report_public_url(self, request, pk=None):
        scenario = self.get_object()

        query_serializer = FundingOpportunityReportSharedLinkQuerySerializer(
            data=request.query_params
        )
        query_serializer.is_valid(raise_exception=True)

        report = get_object_or_404(FundingOpportunityReport, scenario=scenario)

        shared_link, _ = FundingOpportunityReportSharedLink.objects.get_or_create(
            report=report,
            configuration=query_serializer.validated_data,
        )
        return Response({"public_url": shared_link.get_public_url()})


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
    list=extend_schema(description="List Treatment Goals."),
    retrieve=extend_schema(description="Detail Treatment Goal."),
)
class TreatmentGoalViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    A viewset for viewing and editing TreatmentGoal instances.
    """

    serializer_class = TreatmentGoalSerializer
    filterset_class = TreatmentGoalFilter
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ["category", "name"]
    ordering = ["category", "name"]

    def get_queryset(self):
        user = self.request.user if self.request else None
        qs = TreatmentGoal.objects.accessible_by(user)
        return qs
