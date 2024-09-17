from django.db.models.base import ValidationError
from rest_framework import mixins, viewsets, response, status
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.views import Response
from impacts.filters import TreatmentPlanFilterSet
from impacts.models import TreatmentPlan, TreatmentPrescription
from impacts.permissions import (
    TreatmentPlanViewPermission,
    TreatmentPrescriptionViewPermission,
)
from impacts.serializers import (
    CreateTreatmentPlanSerializer,
    OutputSummarySerializer,
    SummarySerializer,
    TreatmentPlanListSerializer,
    TreatmentPlanUpdateSerializer,
    TreatmentPlanSerializer,
    TreatmentPrescriptionSerializer,
    TreatmentPrescriptionListSerializer,
    TreatmentPrescriptionBatchDeleteSerializer,
    TreatmentPrescriptionBatchDeleteResponseSerializer,
    UpsertTreamentPrescriptionSerializer,
)
from impacts.services import (
    clone_treatment_plan,
    create_treatment_plan,
    generate_summary,
    upsert_treatment_prescriptions,
)
from planscape.serializers import BaseErrorMessageSerializer


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
        description="Create Tratment Plan.",
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
        description="Create a Tretment Prescription.",
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
