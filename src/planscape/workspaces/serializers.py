from rest_framework import serializers

from datasets.models import Dataset, Style
from workspaces.models import UserAccessWorkspace, Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "visibility", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]


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
        fields = ["id", "name", "visibility"]


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
