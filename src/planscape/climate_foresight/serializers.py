from rest_framework import serializers
from climate_foresight.models import ClimateForesightRun
from planning.models import PlanningArea


class ClimateForesightRunSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightRun model.

    selected_data_layers should be a list of objects with:
    - data_layer_id (int): ID of the selected data layer
    - favor_high (bool): True if high values are favorable, False if low values are favorable
    - pillar (str): The pillar/category assignment for this layer
    """

    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    created_at = serializers.DateTimeField(read_only=True)
    planning_area_name = serializers.CharField(
        source="planning_area.name", read_only=True
    )
    creator = serializers.SerializerMethodField()

    class Meta:
        model = ClimateForesightRun
        fields = [
            "id",
            "name",
            "planning_area",
            "planning_area_name",
            "created_by",
            "creator",
            "status",
            "created_at",
            "selected_data_layers",
        ]
        read_only_fields = ["id", "created_at", "planning_area_name", "creator"]

    def get_creator(self, obj):
        """Return the user's full name."""
        if obj.created_by.first_name and obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return obj.created_by.username

    def validate_planning_area(self, value):
        """Ensure the user has access to the planning area."""
        user = self.context["request"].user
        if not PlanningArea.objects.list_by_user(user).filter(id=value.id).exists():
            raise serializers.ValidationError(
                "You don't have access to this planning area."
            )
        return value


class ClimateForesightRunListSerializer(serializers.ModelSerializer):
    """Serializer for listing ClimateForesightRun runs."""

    planning_area_name = serializers.CharField(
        source="planning_area.name", read_only=True
    )
    creator = serializers.SerializerMethodField()

    class Meta:
        model = ClimateForesightRun
        fields = [
            "id",
            "name",
            "planning_area",
            "planning_area_name",
            "creator",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "planning_area_name", "creator"]

    def get_creator(self, obj):
        """Return the user's full name."""
        if obj.created_by.first_name and obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return obj.created_by.username
