from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet

from metrics.filters import MetricFilterSet
from metrics.models import Metric
from metrics.serializers import MetricSerializer


class MetricsViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    queryset = Metric.objects.all()
    ordering_fields = ["name", "created_at"]
    filterset_class = MetricFilterSet
    serializer_class = MetricSerializer
