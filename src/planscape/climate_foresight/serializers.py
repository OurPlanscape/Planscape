from rest_framework import serializers
from climate_foresight.models import (
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
)
from planning.models import PlanningArea


class ClimateForesightRunInputDataLayerSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightRunInputDataLayer model."""

    class Meta:
        model = ClimateForesightRunInputDataLayer
        fields = ["id", "datalayer", "favor_high", "pillar"]
        read_only_fields = ["id"]


class ClimateForesightRunSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightRun model."""

    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    created_at = serializers.DateTimeField(read_only=True)
    planning_area_name = serializers.CharField(
        source="planning_area.name", read_only=True
    )
    creator = serializers.SerializerMethodField()
    input_datalayers = ClimateForesightRunInputDataLayerSerializer(
        many=True, required=False
    )

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
            "input_datalayers",
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

    def create(self, validated_data):
        input_datalayers_data = validated_data.pop("input_datalayers", [])
        run = ClimateForesightRun.objects.create(**validated_data)
        for datalayer_data in input_datalayers_data:
            ClimateForesightRunInputDataLayer.objects.create(run=run, **datalayer_data)
        return run

    def update(self, instance, validated_data):
        input_datalayers_data = validated_data.pop("input_datalayers", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if input_datalayers_data is not None:
            instance.input_datalayers.all().delete()
            for datalayer_data in input_datalayers_data:
                ClimateForesightRunInputDataLayer.objects.create(
                    run=instance, **datalayer_data
                )

        return instance


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
