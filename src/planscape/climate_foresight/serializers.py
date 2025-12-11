from datasets.serializers import DataLayerSerializer
from planning.models import PlanningArea
from rest_framework import serializers

from climate_foresight.models import (
    ClimateForesightLandscapeRollup,
    ClimateForesightPillar,
    ClimateForesightPillarRollup,
    ClimateForesightPromote,
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
    ClimateForesightRunStatus,
)
from climate_foresight.tasks import calculate_climate_foresight_layer_statistics


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
    pillar_rollups = serializers.SerializerMethodField()
    landscape_rollup = serializers.SerializerMethodField()
    promote = serializers.SerializerMethodField()

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
            "pillar_rollups",
            "landscape_rollup",
            "promote",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "planning_area_name",
            "creator",
            "pillar_rollups",
            "landscape_rollup",
            "promote",
        ]

    def get_creator(self, obj):
        """Return the user's full name."""
        if obj.created_by.first_name and obj.created_by.last_name:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return obj.created_by.username

    def get_pillar_rollups(self, obj):
        """Return pillar rollup status for this run."""
        from climate_foresight.serializers import ClimateForesightPillarRollupSerializer

        rollups = obj.pillar_rollups.all()
        return ClimateForesightPillarRollupSerializer(rollups, many=True).data

    def get_landscape_rollup(self, obj):
        """Return landscape rollup data if it exists."""
        from climate_foresight.serializers import (
            ClimateForesightLandscapeRollupSerializer,
        )

        try:
            return ClimateForesightLandscapeRollupSerializer(obj.landscape_rollup).data
        except ClimateForesightLandscapeRollup.DoesNotExist:
            return None

    def get_promote(self, obj):
        """Return PROMOTe analysis data if it exists."""
        from climate_foresight.serializers import ClimateForesightPromoteSerializer

        try:
            return ClimateForesightPromoteSerializer(obj.promote_analysis).data
        except (ClimateForesightPromote.DoesNotExist, AttributeError):
            return None

    def validate_planning_area(self, value):
        """Ensure the user has access to the planning area."""
        user = self.context["request"].user
        if not PlanningArea.objects.list_by_user(user).filter(id=value.id).exists():
            raise serializers.ValidationError(
                "You don't have access to this planning area."
            )
        return value

    def validate(self, attrs):
        """Validate step advancement requirements."""
        current_step = attrs.get("current_step")
        input_datalayers_data = attrs.get("input_datalayers")

        # If advancing to step 3 (after assigning favorability) or beyond, validate favor_high is set
        if current_step and current_step >= 3:
            if input_datalayers_data is None and self.instance:
                layers_without_favor_high = self.instance.input_datalayers.filter(
                    favor_high__isnull=True
                )
                if layers_without_favor_high.exists():
                    raise serializers.ValidationError(
                        "All data layers must have favorability (favor_high) set before advancing past step 2."
                    )
            elif input_datalayers_data is not None:
                for layer_data in input_datalayers_data:
                    if layer_data.get("favor_high") is None:
                        raise serializers.ValidationError(
                            "All data layers must have favorability (favor_high) set before advancing past step 2."
                        )

        return attrs

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


class ClimateForesightPillarSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightPillar model."""

    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_custom = serializers.BooleanField(read_only=True)
    can_delete = serializers.BooleanField(read_only=True)

    class Meta:
        model = ClimateForesightPillar
        fields = [
            "id",
            "run",
            "name",
            "order",
            "created_by",
            "created_at",
            "is_custom",
            "can_delete",
        ]
        read_only_fields = ["id", "created_at", "is_custom", "can_delete"]

    def validate_run_id(self, value):
        """
        Validate that the run is provided for custom pillars.
        Users cannot create global pillars (run=None) via the API.
        """
        if value is None:
            raise serializers.ValidationError(
                "Custom pillars must be associated with an analysis. "
                "Global pillars can only be created by system administrators."
            )

        user = self.context["request"].user
        if value.created_by != user:
            raise serializers.ValidationError(
                "You don't have permission to create pillars for this run."
            )

        return value

    def validate(self, attrs):
        """Additional validation for pillar creation/update."""
        run = attrs.get("run")

        if self.instance and not run:
            run = self.instance.run

        if self.instance and not self.instance.is_custom:
            raise serializers.ValidationError(
                "Global pillars cannot be modified via the API."
            )

        if run and run.status != ClimateForesightRunStatus.DRAFT:
            raise serializers.ValidationError(
                "Pillars can only be created or modified when the analysis is in draft mode."
            )

        return attrs


class ClimateForesightPillarRollupSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightPillarRollup model."""

    pillar_name = serializers.CharField(source="pillar.name", read_only=True)
    rollup_datalayer_id = serializers.IntegerField(
        source="rollup_datalayer.id", read_only=True, allow_null=True
    )
    rollup_datalayer = DataLayerSerializer(read_only=True, allow_null=True)

    class Meta:
        model = ClimateForesightPillarRollup
        fields = [
            "id",
            "run",
            "pillar",
            "pillar_name",
            "rollup_datalayer_id",
            "rollup_datalayer",
            "status",
            "method",
            "weights",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "pillar_name",
            "rollup_datalayer_id",
            "rollup_datalayer",
            "status",
            "weights",
            "created_at",
        ]


class ClimateForesightLandscapeRollupSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightLandscapeRollup model."""

    current_datalayer_id = serializers.IntegerField(
        source="current_datalayer.id", read_only=True, allow_null=True
    )
    future_datalayer_id = serializers.IntegerField(
        source="future_datalayer.id", read_only=True, allow_null=True
    )
    current_datalayer = DataLayerSerializer(read_only=True, allow_null=True)

    class Meta:
        model = ClimateForesightLandscapeRollup
        fields = [
            "id",
            "run",
            "current_datalayer_id",
            "future_datalayer_id",
            "current_datalayer",
            "status",
            "future_mapping",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "current_datalayer_id",
            "future_datalayer_id",
            "current_datalayer",
            "status",
            "future_mapping",
            "created_at",
        ]


class ClimateForesightPromoteSerializer(serializers.ModelSerializer):
    """Serializer for ClimateForesightPromote (MPAT analysis) results."""

    monitor_datalayer_id = serializers.IntegerField(
        source="monitor_datalayer.id", read_only=True, allow_null=True
    )
    protect_datalayer_id = serializers.IntegerField(
        source="protect_datalayer.id", read_only=True, allow_null=True
    )
    adapt_datalayer_id = serializers.IntegerField(
        source="adapt_datalayer.id", read_only=True, allow_null=True
    )
    transform_datalayer_id = serializers.IntegerField(
        source="transform_datalayer.id", read_only=True, allow_null=True
    )
    adapt_protect_datalayer_id = serializers.IntegerField(
        source="adapt_protect_datalayer.id", read_only=True, allow_null=True
    )
    integrated_condition_score_datalayer_id = serializers.IntegerField(
        source="integrated_condition_score_datalayer.id",
        read_only=True,
        allow_null=True,
    )
    mpat_matrix_datalayer_id = serializers.IntegerField(
        source="mpat_matrix_datalayer.id", read_only=True, allow_null=True
    )
    mpat_strength_datalayer_id = serializers.IntegerField(
        source="mpat_strength_datalayer.id", read_only=True, allow_null=True
    )

    mpat_strength_datalayer = DataLayerSerializer(read_only=True, allow_null=True)
    adapt_protect_datalayer = DataLayerSerializer(read_only=True, allow_null=True)
    integrated_condition_score_datalayer = DataLayerSerializer(
        read_only=True, allow_null=True
    )

    geopackage_url = serializers.SerializerMethodField()

    def get_geopackage_url(self, obj):
        """Return presigned download URL if geopackage is ready."""
        return obj.get_geopackage_url()

    class Meta:
        model = ClimateForesightPromote
        fields = [
            "id",
            "run",
            "status",
            "monitor_datalayer_id",
            "protect_datalayer_id",
            "adapt_datalayer_id",
            "transform_datalayer_id",
            "adapt_protect_datalayer_id",
            "integrated_condition_score_datalayer_id",
            "mpat_matrix_datalayer_id",
            "mpat_strength_datalayer_id",
            "mpat_strength_datalayer",
            "adapt_protect_datalayer",
            "integrated_condition_score_datalayer",
            "geopackage_status",
            "geopackage_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "monitor_datalayer_id",
            "protect_datalayer_id",
            "adapt_datalayer_id",
            "transform_datalayer_id",
            "adapt_protect_datalayer_id",
            "integrated_condition_score_datalayer_id",
            "mpat_matrix_datalayer_id",
            "mpat_strength_datalayer_id",
            "mpat_strength_datalayer",
            "adapt_protect_datalayer",
            "integrated_condition_score_datalayer",
            "geopackage_status",
            "created_at",
        ]
