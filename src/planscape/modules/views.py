from typing import Any, Dict

from rest_framework.exceptions import NotFound
from rest_framework.mixins import RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.viewsets import GenericViewSet

from modules.serializers import ModuleSerializer
from modules.services import get_module


class ModuleViewSet(RetrieveModelMixin, GenericViewSet):
    lookup_field = "pk"
    serializer_class = ModuleSerializer

    def get_serializer(self, *args: Any, **kwargs: Any) -> BaseSerializer:
        module_name = str(self.kwargs.get(self.lookup_field))
        return ModuleSerializer(module_name=module_name)

    def get_object(self) -> Dict[str, Any]:
        pk = str(self.kwargs.get(self.lookup_field))
        try:
            return get_module(module_name=pk)
        except KeyError:
            raise NotFound(f"No item with key '{pk}'")

    def retrieve(self, request, *args, **kwargs):
        payload = self.get_object()
        # this is passed as SerializerClass(data=payload)
        serializer = self.get_serializer(data=payload)
        return Response(serializer.data)
