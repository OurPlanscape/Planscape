from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAdminUser

from core.serializers import MultiSerializerMixin
from datasets.models import DataLayer
from datasets.serializers import CreateDataLayerSerializer, DataLayerSerializer


class CLIDataLayerViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
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
