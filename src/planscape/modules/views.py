from rest_framework.exceptions import NotFound
from rest_framework.mixins import RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from modules.base import BaseModule, get_module
from modules.serializers import ModuleSerializer


class ModuleViewSet(RetrieveModelMixin, GenericViewSet):
    lookup_field = "pk"
    serializer_class = ModuleSerializer

    def get_object(self) -> BaseModule:
        pk = str(self.kwargs.get(self.lookup_field))
        try:
            return get_module(module_name=pk)
        except KeyError:
            raise NotFound(f"No item with key '{pk}'")

    def retrieve(self, request, *args, **kwargs):
        pk = str(self.kwargs.get(self.lookup_field))
        my_module = self.get_object()
        payload = my_module.get_configuration()
        serializer = ModuleSerializer(instance=payload, module_name=pk)
        return Response(serializer.data)
