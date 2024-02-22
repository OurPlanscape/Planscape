from rest_framework import serializers
from collaboration.models import Role


class CreateUserObjectRolesSerializer(serializers.Serializer):
    emails = serializers.ListField(child=serializers.EmailField(), min_length=1)

    role = serializers.ChoiceField(choices=Role.choices)

    message = serializers.CharField(
        max_length=1024,
        allow_null=True,
        required=False,
    )
