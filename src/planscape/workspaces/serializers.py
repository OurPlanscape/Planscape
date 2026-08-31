from datasets.models import Dataset, Style
from rest_framework import serializers

from workspaces.models import UserAccessWorkspace, Workspace, WorkspaceRole
from workspaces.permissions import get_workspace_permissions, get_workspace_role


class WorkspaceSerializer(serializers.ModelSerializer):
    counts = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "visibility",
            "created_at",
            "updated_at",
            "deleted_at",
            "counts",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at", "counts"]

    def get_counts(self, obj):
        datasets_count = getattr(obj, "datasets_count", None)
        styles_count = getattr(obj, "styles_count", None)
        users_count = getattr(obj, "users_count", None)

        return {
            "datasets": datasets_count
            if datasets_count is not None
            else obj.datasets.count(),
            "styles": styles_count if styles_count is not None else obj.styles.count(),
            "users": users_count
            if users_count is not None
            else obj.user_access.count(),
        }


class CreateWorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["name", "visibility"]


class UpdateWorkspaceSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    visibility = serializers.CharField(required=False)

    class Meta:
        model = Workspace
        fields = ["id", "name", "visibility"]
        read_only_fields = ["id"]


class WorkspaceDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = [
            "id",
            "organization",
            "workspace_id",
            "name",
            "visibility",
            "version",
            "modules",
            "selection_type",
            "preferred_display_type",
        ]


class WorkspaceStyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Style
        fields = ["id", "name", "type"]


class WorkspaceUserAccessSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")

    class Meta:
        model = UserAccessWorkspace
        fields = ["user_id", "email", "first_name", "last_name", "role"]


class ListWorkspaceSerializer(serializers.ModelSerializer):
    """User facing representation of a planning Workspace."""

    creator = serializers.CharField(
        source="creator_name",
        read_only=True,
        help_text="Name of the user that created the Workspace, at creation time.",
    )
    planning_areas_count = serializers.SerializerMethodField(
        help_text="Number of Planning Areas in the Workspace."
    )
    collaborators_count = serializers.SerializerMethodField(
        help_text="Number of users with access to the Workspace."
    )
    role = serializers.SerializerMethodField(
        help_text="Requester role in the Workspace."
    )
    permissions = serializers.SerializerMethodField(
        help_text="Requester permissions for the Workspace."
    )

    def get_planning_areas_count(self, instance) -> int:
        count = getattr(instance, "planning_areas_count", None)
        if count is not None:
            return count
        return instance.planning_areas.filter(deleted_at=None).count()

    def get_collaborators_count(self, instance) -> int:
        count = getattr(instance, "collaborators_count", None)
        if count is not None:
            return count
        return instance.user_access.count()

    def get_role(self, instance):
        return get_workspace_role(self.context["request"].user, instance)

    def get_permissions(self, instance):
        return get_workspace_permissions(self.context["request"].user, instance)

    class Meta:
        model = Workspace
        fields = (
            "id",
            "name",
            "creator",
            "created_by",
            "created_at",
            "updated_at",
            "planning_areas_count",
            "collaborators_count",
            "role",
            "permissions",
        )
        read_only_fields = fields


class CreatePlanningWorkspaceSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    def validate(self, attrs):
        if Workspace.objects.filter(
            created_by=attrs["created_by"],
            name=attrs["name"],
        ).exists():
            raise serializers.ValidationError(
                {"name": "A workspace with this name already exists."}
            )
        return attrs

    class Meta:
        model = Workspace
        fields = (
            "created_by",
            "name",
        )
        validators = []


class UpdatePlanningWorkspaceSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if not attrs.get("name"):
            raise serializers.ValidationError({"name": "A workspace name is required."})
        instance = self.instance
        if (
            Workspace.objects.filter(
                created_by=instance.created_by,
                name=attrs["name"],
            )
            .exclude(id=instance.pk)
            .exists()
        ):
            raise serializers.ValidationError(
                {"name": "A workspace with this name already exists."}
            )
        return attrs

    class Meta:
        model = Workspace
        fields = ("name",)
        validators = []


class InviteWorkspaceMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=WorkspaceRole.choices)
    message = serializers.CharField(required=False, allow_blank=True, default="")


class UpdateWorkspaceMemberSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=WorkspaceRole.choices)


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    """Planning-facing roster entry: covers both accepted members (user set)
    and pending invites (user is null, email set)."""

    email = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    def get_email(self, instance) -> str:
        return instance.user.email if instance.user_id else instance.email

    def get_first_name(self, instance) -> str:
        return instance.user.first_name if instance.user_id else ""

    def get_last_name(self, instance) -> str:
        return instance.user.last_name if instance.user_id else ""

    def get_status(self, instance) -> str:
        return "ACTIVE" if instance.user_id else "PENDING"

    class Meta:
        model = UserAccessWorkspace
        fields = [
            "user_id",
            "email",
            "first_name",
            "last_name",
            "role",
            "status",
        ]
