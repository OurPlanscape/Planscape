from datasets.models import Dataset, Style
from rest_framework import serializers

from workspaces.models import UserAccessWorkspace, Workspace


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
        fields = ["name", "visibility"]


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
