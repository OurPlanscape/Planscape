from typing import Optional, Type
from rest_framework.serializers import Serializer


class MultiSerializerMixin:
    action: str
    serializer_class: Type[Serializer]
    serializer_classes = {"list": serializer_class}

    def get_serializer_class(self) -> Type[Serializer]:
        assert self.serializer_class is not None
        try:
            return self.serializer_classes[self.action]
        except KeyError:
            return self.serializer_class
