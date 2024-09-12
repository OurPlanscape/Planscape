from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from rest_framework.pagination import LimitOffsetPagination
from drf_spectacular.utils import extend_schema_view, extend_schema
from goals.filters import TreatmentGoalFilterSet
from goals.models import TreatmentGoal
from goals.serializers import TreatmentGoalSerializer
from projects.models import ProjectVisibility


@extend_schema_view(
    list=extend_schema(description="List treatment goals."),
    retrieve=extend_schema(
        description="Detail a treatment goal.",
        responses={200: TreatmentGoalSerializer, 404: None},
    ),
)
class TreatmentGoalViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    queryset = TreatmentGoal.objects.filter(
        project__visibility=ProjectVisibility.PUBLIC
    ).select_related(
        "project",
        "project__organization",
    )
    pagination_class = LimitOffsetPagination
    ordering_fields = ["name", "created_at"]
    filterset_class = TreatmentGoalFilterSet
    serializer_class = TreatmentGoalSerializer
