from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from rest_framework.pagination import LimitOffsetPagination
from drf_spectacular.utils import extend_schema_view, extend_schema
from metrics.filters import MetricFilterSet
from metrics.models import Metric
from metrics.serializers import MetricSerializer
from projects.models import ProjectVisibility


@extend_schema_view(
    list=extend_schema(
        description="List project's metrics that needs to be processed and will be used by the system"
    ),
    retrieve=extend_schema(
        description="Detail project's metrics  that needs to be processed and will be used by the system",
        responses={200: MetricSerializer, 404: None},
    ),
)
class MetricsViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    queryset = Metric.objects.filter(
        project__visibility=ProjectVisibility.PUBLIC
    ).select_related(
        "project",
        "project__organization",
        "dataset",
        "category",
    )
    pagination_class = LimitOffsetPagination
    ordering_fields = ["name", "created_at"]
    filterset_class = MetricFilterSet
    serializer_class = MetricSerializer
