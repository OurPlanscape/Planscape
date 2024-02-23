from rest_framework import serializers
from collaboration.models import Role


class CreateUserObjectRolesSerializer(serializers.Serializer):

    target_entity = serializers.ChoiceField(
        choices=[("PlanningArea", "Planning Area")],
        required=False,
        default="PlanningArea",
    )

    target_object_pk = serializers.IntegerField(min_value=0, required=True)

    emails = serializers.ListField(child=serializers.EmailField(), min_length=1)

    role = serializers.ChoiceField(choices=Role.choices)

    message = serializers.CharField(
        max_length=1024,
        allow_null=True,
        required=False,
    )
