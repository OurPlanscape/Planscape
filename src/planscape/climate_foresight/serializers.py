from rest_framework import serializers
from climate_foresight.models import (
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
)
from climate_foresight.tasks import calculate_climate_foresight_layer_statistics
from planning.models import PlanningArea


class ClimateForesightRunInputDataLayerSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightRunInputDataLayer model."""

    normalized_datalayer_id = serializers.IntegerField(
        source="normalized_datalayer.id", read_only=True, allow_null=True
    )

    class Meta:
        model = ClimateForesightRunInputDataLayer
        fields = [
            "id",
            "datalayer",
            "favor_high",
            "pillar",
            "normalized_datalayer_id",
            "statistics",
        ]
        read_only_fields = [
            "id",
            "normalized_datalayer_id",
            "statistics",
        ]


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
            "current_step",
            "furthest_step",
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
            input_dl = ClimateForesightRunInputDataLayer.objects.create(
                run=run, **datalayer_data
            )
            calculate_climate_foresight_layer_statistics.delay(input_dl.id)

        if input_datalayers_data:
            run.furthest_step = max(run.furthest_step, 1)
            run.save()

        return run

    def update(self, instance, validated_data):
        input_datalayers_data = validated_data.pop("input_datalayers", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if input_datalayers_data is not None:
            existing_layers = {
                layer.datalayer: layer for layer in instance.input_datalayers.all()
            }

            incoming_datalayer_ids = {
                datalayer_data.get("datalayer")
                for datalayer_data in input_datalayers_data
            }

            for datalayer_data in input_datalayers_data:
                datalayer_id = datalayer_data.get("datalayer")
                existing_layer = existing_layers.get(datalayer_id)

                if existing_layer:
                    for attr, value in datalayer_data.items():
                        if attr != "datalayer":
                            setattr(existing_layer, attr, value)
                    existing_layer.save()
                else:
                    input_dl = ClimateForesightRunInputDataLayer.objects.create(
                        run=instance, **datalayer_data
                    )
                    calculate_climate_foresight_layer_statistics.delay(input_dl.id)

            for datalayer_id, layer in existing_layers.items():
                if datalayer_id not in incoming_datalayer_ids:
                    layer.delete()

            if "furthest_step" not in validated_data:
                instance.furthest_step = max(instance.furthest_step, 1)

        instance.save()
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
