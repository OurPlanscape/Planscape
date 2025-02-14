from rest_framework import serializers
from collaboration.models import Role, UserObjectRole
from collaboration.services import get_permissions


class CreateUserObjectRolesSerializer(serializers.Serializer):
    target_entity = serializers.ChoiceField(
        choices=[("planningarea", "Planning Area")],
        default="planningarea",
    )

    object_pk = serializers.IntegerField(min_value=0)

    emails = serializers.ListField(child=serializers.EmailField(), min_length=1)

    role = serializers.ChoiceField(choices=Role.choices)

    message = serializers.CharField(
        max_length=1024,
        default=None,
        allow_null=True,
        required=False,
    )


class UserObjectRoleSerializer(serializers.ModelSerializer):
    collaborator = serializers.PrimaryKeyRelatedField(read_only=True)

    inviter = serializers.PrimaryKeyRelatedField(read_only=True)

    role = serializers.ChoiceField(choices=Role.choices)

    permissions = serializers.SerializerMethodField()

    def get_permissions(self, instance):
        request = self.context["request"]
        user = request.user
        return get_permissions(user, instance)

    collaborator_name = serializers.SerializerMethodField()

    def get_collaborator_name(self, instance):
        if instance.collaborator:
            return instance.collaborator.get_full_name()

    class Meta:
        model = UserObjectRole
        fields = (
            "id",
            "created_at",
            "updated_at",
            "email",
            "collaborator",
            "role",
            "inviter",
            "content_type",
            "object_pk",
            "permissions",
            "collaborator_name",
        )
