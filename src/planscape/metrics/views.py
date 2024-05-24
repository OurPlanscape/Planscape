from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet

from metrics.filters import MetricFilterSet
from metrics.models import Metric
from metrics.serializers import MetricSerializer
from projects.models import ProjectVisibility


class MetricsViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    queryset = Metric.objects.filter(
        project__visibility=ProjectVisibility.PUBLIC
    ).select_related(
        "project",
        "project__organization",
        "dataset",
        "category",
    )
    ordering_fields = ["name", "created_at"]
    filterset_class = MetricFilterSet
    serializer_class = MetricSerializer
    lookup_field = "uuid"
