from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework import status
from core.serializers import MultiSerializerMixin
from datasets.models import DataLayer, Dataset
from datasets.serializers import (
    CreateDataLayerSerializer,
    CreateDatasetSerializer,
    DataLayerCreatedSerializer,
    DataLayerSerializer,
    DatasetSerializer,
)
from datasets.services import create_datalayer


class AdminDatasetViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
    CreateModelMixin,
    GenericViewSet,
):
    queryset = Dataset.objects.all()
    permission_classes = [IsAdminUser]
    serializer_class = DatasetSerializer
    serializer_classes = {
        "list": DatasetSerializer,
        "create": CreateDatasetSerializer,
        "retrieve": DatasetSerializer,
    }
    pagination_class = LimitOffsetPagination


class AdminDataLayerViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
    CreateModelMixin,
    GenericViewSet,
):
    queryset = DataLayer.objects.all()
    permission_classes = [IsAdminUser]
    serializer_class = DataLayerSerializer
    serializer_classes = {
        "list": DataLayerSerializer,
        "create": CreateDataLayerSerializer,
        "retrieve": DataLayerSerializer,
    }
    pagination_class = LimitOffsetPagination

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datalayer_created = create_datalayer(**serializer.validated_data)
        out_serializer = DataLayerCreatedSerializer(instance=datalayer_created)
        headers = self.get_success_headers(serializer.data)
        return Response(
            out_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )
