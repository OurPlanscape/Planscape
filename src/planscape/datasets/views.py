from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework import status
from core.serializers import MultiSerializerMixin
from datasets.filters import DataLayerFilterSet
from datasets.models import DataLayer, Dataset, VisibilityOptions
from datasets.serializers import (
    DataLayerSerializer,
    DatasetSerializer,
)


class DatasetViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = Dataset.objects.none()
    permission_classes = [IsAuthenticated]
    pagination_class = LimitOffsetPagination
    serializer_class = DatasetSerializer
    serializer_classes = {
        "list": DatasetSerializer,
    }

    def get_queryset(self):
        # TODO: afterwards we need to implement the filtering
        # by organization visibility too, so we return the public ones
        # PLUS all the datasets accessible by the organization
        return Dataset.objects.filter(visibility=VisibilityOptions.PUBLIC)


class DataLayerViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = DataLayer.objects.none()
    permission_classes = [IsAuthenticated]
    pagination_class = LimitOffsetPagination
    serializer_class = DataLayerSerializer
    serializer_classes = {
        "list": DataLayerSerializer,
    }
    filterset_class = DataLayerFilterSet

    def get_queryset(self):
        # TODO: afterwards we need to implement the filtering
        # by organization visibility too, so we return the public ones
        # PLUS all the datalayers accessible by the organization
        return DataLayer.objects.filter(
            dataset__visibility=VisibilityOptions.PUBLIC,
        )
