from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.mixins import RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from modules.base import BaseModule, get_module
from modules.serializers import InputModuleSerializer


class ModuleViewSet(RetrieveModelMixin, GenericViewSet):
    lookup_field = "pk"
    serializer_class = InputModuleSerializer

    def get_object(self) -> BaseModule:
        pk = str(self.kwargs.get(self.lookup_field))
        try:
            return get_module(module_name=pk)
        except KeyError:
            raise NotFound(f"No item with key '{pk}'")

    def retrieve(self, request, *args, **kwargs):
        my_module = self.get_object()
        input_serializer = InputModuleSerializer(data=request.query_params)
        input_serializer.is_valid(raise_exception=True)
        geometry = input_serializer.validated_data.get("geometry")
        payload = my_module.get_configuration(geometry=geometry)
        SerializerClass = my_module.get_serializer_class()
        serializer = SerializerClass(instance=payload)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def details(self, request, pk=None):
        my_module = self.get_object()

        params = request.query_params if request.method == "GET" else request.data
        input_serializer = InputModuleSerializer(data=params)
        input_serializer.is_valid(raise_exception=True)
        geometry = input_serializer.validated_data.get("geometry")

        payload = my_module.get_configuration(geometry=geometry)
        SerializerClass = my_module.get_serializer_class()
        serializer = SerializerClass(instance=payload)
        return Response(serializer.data)