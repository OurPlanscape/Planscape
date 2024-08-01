from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from rest_framework.pagination import LimitOffsetPagination
from goals.filters import TreatmentGoalFilterSet
from goals.models import TreatmentGoal
from goals.serializers import TreatmentGoalSerializer
from projects.models import ProjectVisibility


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
