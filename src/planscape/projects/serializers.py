from rest_framework import serializers

from projects.models import Project


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = (
            "id",
            "organization",
            "created_at",
            "created_by",
            "updated_at",
            "name",
            "display_name",
            "visibility",
            "capabilities",
            "geometry",
        )
