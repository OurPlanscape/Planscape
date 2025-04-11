import logging

from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiTypes, extend_schema, extend_schema_view
from impacts.filters import TreatmentPlanFilterSet, TreatmentPlanNoteFilterSet
from impacts.models import (
    TreatmentPlan,
    TreatmentPlanNote,
    TreatmentPlanStatus,
    TreatmentPrescription,
)
from impacts.permissions import (
    TreatmentPlanNoteViewPermission,
    TreatmentPlanViewPermission,
    TreatmentPrescriptionViewPermission,
)
from impacts.serializers import (
    CreateTreatmentPlanSerializer,
    OutputSummarySerializer,
    StandQuerySerializer,
    SummarySerializer,
    TreatmentPlanListSerializer,
    TreatmentPlanNoteCreateSerializer,
    TreatmentPlanNoteListSerializer,
    TreatmentPlanNoteSerializer,
    TreatmentPlanSerializer,
    TreatmentPlanUpdateSerializer,
    TreatmentPrescriptionBatchDeleteResponseSerializer,
    TreatmentPrescriptionBatchDeleteSerializer,
    TreatmentPrescriptionListSerializer,
    TreatmentPrescriptionSerializer,
    TreatmentResultSerializer,
    UpsertTreamentPrescriptionSerializer,
)
from impacts.services import (
    clone_treatment_plan,
    create_treatment_plan,
    export_geopackage,
    generate_impact_results_data_to_plot,
    generate_summary,
    get_treatment_results_table_data,
    upsert_treatment_prescriptions,
)
from impacts.tasks import async_calculate_persist_impacts_treatment_plan
from rest_framework import mixins, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response

from planscape.serializers import BaseErrorMessageSerializer

log = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(description="List Treatment Plans."),
    retrieve=extend_schema(
        description="Retrieve Treatment Plans.",
        responses={
            200: TreatmentPlanSerializer,
            404: BaseErrorMessageSerializer,
        },
    ),
    update=extend_schema(
        description="Update Treatment Plans.",
        responses={
            200: TreatmentPlanUpdateSerializer,
            404: BaseErrorMessageSerializer,
        },
    ),
    partial_update=extend_schema(
        description="Update Treatment Plans.",
        responses={
            200: TreatmentPlanUpdateSerializer,
            404: BaseErrorMessageSerializer,
        },
    ),
    destroy=extend_schema(
        description="Deletes a Treatment Plan.",
        responses={
            204: None,
            404: BaseErrorMessageSerializer,
        },
    ),
)
class TreatmentPlanViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = TreatmentPlan.objects.none()
    filterset_class = TreatmentPlanFilterSet
    permission_classes = [TreatmentPlanViewPermission]
    serializer_class = TreatmentPlanSerializer
    serializer_classes = {
        "list": TreatmentPlanListSerializer,
        "create": CreateTreatmentPlanSerializer,
        "retrieve": TreatmentPlanSerializer,
        "update": TreatmentPlanUpdateSerializer,
        "partial_update": TreatmentPlanUpdateSerializer,
    }

    def get_queryset(self):
        user = self.request.user
        qs = TreatmentPlan.objects.list_by_user(user=user).select_related(
            "scenario",
            "scenario__planning_area",
            "created_by",
        )
        return qs

    def get_serializer_class(self):
        try:
            return self.serializer_classes[self.action]
        except KeyError:
            return self.serializer_class

    @extend_schema(
        description="Create Treatment Plan.",
        request=CreateTreatmentPlanSerializer,
        responses={
            201: TreatmentPlanSerializer,
        },
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        out_serializer = TreatmentPlanSerializer(instance=serializer.instance)
        return response.Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        serializer.instance = create_treatment_plan(
            **serializer.validated_data,
        )

    @extend_schema(
        description="Clones a Treatment Plan.",
        responses={
            201: TreatmentPlanSerializer,
            404: BaseErrorMessageSerializer,
        },
    )
    @action(
        detail=True,
        methods=["post"],
        filterset_class=None,
    )
    def clone(self, request, pk=None):
        treatment_plan = self.get_object()
        cloned_plan, cloned_prescriptions = clone_treatment_plan(
            treatment_plan,
            self.request.user,
        )
        serializer = TreatmentPlanSerializer(instance=cloned_plan)
        return response.Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        description="exports a treatment plan in a zipped shapefile format.",
        responses={
            200: OpenApiTypes.BINARY,
            404: BaseErrorMessageSerializer,
        },
    )
    @action(detail=True, methods=["get"], filterset_class=None)
    def download(self, request, pk=None):
        treatment_plan = self.get_object()
        output_path = export_geopackage(treatment_plan)
        return FileResponse(
            open(output_path, "rb"),
            as_attachment=True,
        )

    @extend_schema(
        description="Runs a Treatment Plan.",
        responses={
            201: TreatmentPlanSerializer,
            400: BaseErrorMessageSerializer,
            404: BaseErrorMessageSerializer,
        },
    )
    @action(
        detail=True,
        methods=["post"],
        filterset_class=None,
    )
    def run(self, request, pk=None):
        treatment_plan = self.get_object()
        if treatment_plan.status != TreatmentPlanStatus.PENDING:
            log.warning(
                f"User requested to run treatment plan {treatment_plan.pk} while it's {treatment_plan.status}."
            )
            return response.Response(
                {"detail": "You can't run the same treatment plan twice."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TODO: refactor this and wrap the change of this status
        # to a service method, that changes the status to queued
        # and queues the execution
        treatment_plan.status = TreatmentPlanStatus.QUEUED
        treatment_plan.save()

        async_calculate_persist_impacts_treatment_plan.delay(
            treatment_plan_pk=treatment_plan.pk,
            user_id=request.user.pk,
        )

        treatment_plan.refresh_from_db()
        serializer = TreatmentPlanSerializer(instance=treatment_plan)
        return response.Response(
            serializer.data,
            status=status.HTTP_202_ACCEPTED,
        )

    @extend_schema(
        description="Summary of a Treatment Plan.",
        parameters=[
            SummarySerializer,
        ],
        responses={
            200: OutputSummarySerializer,
            404: BaseErrorMessageSerializer,
        },
    )
    @action(
        methods=["get"],
        detail=True,
        filterset_class=None,
    )
    def summary(self, request, pk=None):
        instance = self.get_object()

        serializer = SummarySerializer(
            data=request.query_params,
            context={
                "treatment_plan": instance,
            },
        )
        serializer.is_valid(raise_exception=True)
        project_area = serializer.validated_data.get("project_area")
        summary = generate_summary(
            treatment_plan=instance,
            project_area=project_area,
        )
        return Response(data=summary, status=status.HTTP_200_OK)

    @action(
        methods=["get"],
        detail=True,
        filterset_class=None,
    )
    def plot(self, request, pk=None):
        instance = self.get_object()

        serializer = TreatmentResultSerializer(
            data=request.query_params,
            context={
                "treatment_plan": instance,
            },
        )
        serializer.is_valid(raise_exception=True)
        variables = serializer.validated_data.get("variables")
        project_areas = serializer.validated_data.get("project_areas", []) or []
        project_areas_pks = [project_area.pk for project_area in project_areas]
        actions = serializer.validated_data.get("actions")

        data_to_plot = generate_impact_results_data_to_plot(
            treatment_plan=instance,
            impact_variables=variables,
            project_area_pks=project_areas_pks,
            tx_px_actions=actions,
        )
        return Response(data=data_to_plot, status=status.HTTP_200_OK)

    @extend_schema(
        description=(
            "Retrieve treatment results for a specific stand (via `stand_id`) "
            "within the specified Treatment Plan (via path parameter `id`)."
        ),
        parameters=[StandQuerySerializer],
        responses={
            200: TreatmentResultSerializer,
            404: BaseErrorMessageSerializer,
            400: BaseErrorMessageSerializer,
        },
    )
    @action(
        detail=True,
        methods=["get"],
        filterset_class=None,
        url_path="stand-treatment-results",
    )
    def stand_treatment_results(self, request, pk=None):
        """
        Endpoint to retrieve treatment results for a specific stand ID.
        """
        serializer = StandQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        stand = serializer.validated_data["stand_id"]

        treatment_plan = self.get_object()
        table_data = get_treatment_results_table_data(treatment_plan, stand.id)

        return response.Response(table_data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(description="List Treatment Prescriptions."),
    retrieve=extend_schema(
        description="Retrieve a Treatment Prescriptions.",
        responses={
            200: TreatmentPrescriptionSerializer,
            404: BaseErrorMessageSerializer,
        },
    ),
    destroy=extend_schema(
        description="Delete a Treatment Prescriptions.",
        responses={
            204: None,
            404: BaseErrorMessageSerializer,
        },
    ),
)
class TreatmentPrescriptionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = TreatmentPrescription.objects.all().select_related(
        "treatment_plan",
        "treatment_plan__scenario",
        "treatment_plan__scenario__planning_area",
        "created_by",
    )
    permission_classes = [
        TreatmentPrescriptionViewPermission,
    ]
    pagination_class = LimitOffsetPagination
    serializer_class = TreatmentPrescriptionSerializer
    serializer_classes = {
        "list": TreatmentPrescriptionListSerializer,
        "create": UpsertTreamentPrescriptionSerializer,
        "retrieve": TreatmentPrescriptionSerializer,
    }

    def get_serializer_class(self):
        try:
            return self.serializer_classes[self.action]
        except KeyError:
            return self.serializer_class

    def get_queryset(self):
        tx_plan_pk = self.kwargs.get("tx_plan_pk", 0)
        # filter will return zero elements if it does not match with anything
        return TreatmentPrescription.objects.filter(
            treatment_plan_id=tx_plan_pk,
        )

    @extend_schema(
        description="Create a Treatment Prescription.",
        request=UpsertTreamentPrescriptionSerializer,
        responses={201: TreatmentPrescriptionSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prescriptions = self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        out_serializer = TreatmentPrescriptionSerializer(
            instance=prescriptions, many=True
        )
        return response.Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        return upsert_treatment_prescriptions(**serializer.validated_data)

    @extend_schema(
        description="Delete Prescriptions from Treatment Precriptions.",
        responses={
            200: TreatmentPrescriptionBatchDeleteResponseSerializer,
            400: BaseErrorMessageSerializer,
            404: BaseErrorMessageSerializer,
        },
    )
    @action(detail=False, methods=["post"])
    def delete_prescriptions(self, request, tx_plan_pk=None):
        serializer = TreatmentPrescriptionBatchDeleteSerializer(data=request.data)

        if not serializer.is_valid():
            return response.Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        stand_ids = serializer.validated_data.get("stand_ids", [])

        delete_result = TreatmentPrescription.objects.filter(
            stand_id__in=stand_ids, treatment_plan_id=tx_plan_pk
        ).delete()

        return response.Response({"result": delete_result}, status=status.HTTP_200_OK)


class TreatmentPlanNoteViewSet(viewsets.ModelViewSet):
    queryset = TreatmentPlanNote.objects.all()
    serializer_class = TreatmentPlanNoteSerializer
    permission_classes = [TreatmentPlanNoteViewPermission]
    serializer_classes = {
        "list": TreatmentPlanNoteListSerializer,
        "create": TreatmentPlanNoteCreateSerializer,
    }
    filterset_class = TreatmentPlanNoteFilterSet
    filter_backends = [DjangoFilterBackend]

    def get_serializer_class(self):
        return (
            self.serializer_classes.get(self.action, self.serializer_class)
            or self.serializer_class
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        tx_plan_pk = self.kwargs.get("tx_plan_pk")
        if tx_plan_pk is None:
            raise ValueError("treatment plan id is required")
        return self.queryset.filter(treatment_plan_id=tx_plan_pk)
        return self.queryset.filter(treatment_plan_id=tx_plan_pk)
