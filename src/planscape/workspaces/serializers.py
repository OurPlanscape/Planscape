from rest_framework import serializers

from workspaces.models import Workspace


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
