from rest_framework import serializers
from rest_framework.relations import PrimaryKeyRelatedField

from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
)
from planning.models import ProjectArea
from planning.services import get_acreage
from stands.models import Stand, area_from_size


class TxPrescriptionProjectAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectArea
        fields = (
            "id",
            "name",
        )


class CreateTreatmentPlanSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )

    class Meta:
        model = TreatmentPlan
        fields = (
            "created_by",
            "scenario",
            "name",
        )


class TreatmentPlanSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField(
        help_text="Name of the Creator of the Treatment Plan."
    )

    def get_creator_name(self, instance):
        return instance.created_by.get_full_name()

    class Meta:
        model = TreatmentPlan
        fields = (
            "id",
            "created_at",
            "created_by",
            "creator_name",
            "updated_at",
            "scenario",
            "name",
            "status",
        )


class TreatmentPlanListSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField(
        help_text="Name of the Creator of the Treatment Plan."
    )

    def get_creator_name(self, instance):
        return instance.created_by.get_full_name()

    class Meta:
        model = TreatmentPlan
        fields = (
            "id",
            "created_at",
            "creator_name",
            "updated_at",
            "scenario",
            "name",
            "status",
        )


class TreatmentPlanUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = ["name"]


class TreatmentPrescriptionSerializer(serializers.ModelSerializer):
    project_area = TxPrescriptionProjectAreaSerializer(help_text="Project Area.")
    area_acres = serializers.SerializerMethodField(help_text="Area in acres.")

    def get_area_acres(self, instance: TreatmentPrescription) -> float:
        # this path is much faster
        if instance.stand:
            return area_from_size(instance.stand.size)

        return get_acreage(instance.geometry)

    class Meta:
        model = TreatmentPrescription
        fields = (
            "id",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
            "treatment_plan",
            "project_area",
            "stand",
            "action",
            "geometry",
            "area_acres",
        )


class UpsertTreamentPrescriptionSerializer(serializers.Serializer):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )

    treatment_plan = PrimaryKeyRelatedField(
        queryset=TreatmentPlan.objects.all(), help_text="Treatment Plan ID."
    )

    project_area = PrimaryKeyRelatedField(
        queryset=ProjectArea.objects.all(), help_text="Project Area ID."
    )

    action = serializers.ChoiceField(
        choices=TreatmentPrescriptionAction.choices, help_text="Action choice text."
    )

    stands = serializers.PrimaryKeyRelatedField(
        queryset=Stand.objects.all(), many=True, help_text="Stands IDs."
    )


class TreatmentPrescriptionListSerializer(TreatmentPrescriptionSerializer):
    class Meta:
        model = TreatmentPrescription
        fields = (
            "id",
            "created_at",
            "created_by",
            "updated_at",
            "project_area",
            "action",
            "stand",
            "area_acres",
        )


class TreatmentPrescriptionBatchDeleteSerializer(serializers.Serializer):
    stand_ids = serializers.ListField(
        child=serializers.IntegerField(), allow_empty=False, help_text="Stands IDs."
    )


class TreatmentPrescriptionBatchDeleteResponseSerializer(serializers.Serializer):
    result = serializers.ListField(
        child=serializers.IntegerField(), help_text="Deleted stands IDs."
    )


class SummarySerializer(serializers.Serializer):
    project_area = serializers.PrimaryKeyRelatedField(
        queryset=ProjectArea.objects.all(), required=False, help_text="Project Area ID."
    )

    def validate_project_area(self, project_area):
        """
        Validates if the project area selected belongs to
        the same scenario as the treatment plan.
        """
        treatment_plan = self.context.get("treatment_plan", None) or None

        if project_area and treatment_plan:
            if treatment_plan.scenario.pk != project_area.scenario.pk:
                raise serializers.ValidationError(
                    "Project Area does not belong to the same Scenario as Treatment Plan."
                )

        return project_area


# serializers used only for documentation
class OutputPrescriptionSummarySerializer(serializers.Serializer):
    action = serializers.CharField(help_text="Action for Prescription.")
    type = serializers.CharField(help_text="Type of Prescription.")
    area_acres = serializers.FloatField(help_text="Area in Acres.")
    treated_stand_count = serializers.IntegerField(help_text="Total of treated stands.")


class OutputProjectAreaSummarySerializer(serializers.Serializer):
    project_area_id = serializers.IntegerField(help_text="Project Area ID.")
    project_area_name = serializers.CharField(help_text="Project Area Name.")
    total_stand_count = serializers.IntegerField(help_text="Total of stands.")
    prescriptions = serializers.ListField(
        child=OutputPrescriptionSummarySerializer(), help_text="Prescriptions."
    )


class OutputSummarySerializer(serializers.Serializer):
    planning_area_id = serializers.IntegerField(help_text="Planning Area ID.")
    planning_area_name = serializers.CharField(help_text="Planning Area Name.")
    scenario_id = serializers.IntegerField(help_text="Scenario ID.")
    scenario_name = serializers.CharField(help_text="Scenario Name.")
    treatment_plan_id = serializers.IntegerField(help_text="Treatment Plan ID.")
    treatment_plan_name = serializers.CharField(help_text="Treatment Plan Name.")
    project_areas = serializers.ListSerializer(
        child=OutputProjectAreaSummarySerializer(), help_text="Project Areas."
    )


class DataLayerImpactsModuleSerializer(serializers.Serializer):
    """Serializer used to describe and validate part of the
    `modules` field in the `DataLayerMetadataSerializer`.

    Ideally, we would be able to dynamically import these
    serializers that describes the participation of a datalayer
    in a planscape module and validate this on the fly.
    """

    baseline = serializers.BooleanField(
        required=True,
    )

    variable = serializers.ChoiceField(
        choices=ImpactVariable.choices,
        required=True,
    )

    year = serializers.ChoiceField(
        choices=[
            (
                year,
                str(year),
            )
            for year in AVAILABLE_YEARS
        ],
        required=True,
    )

    action = serializers.ChoiceField(
        choices=TreatmentPrescriptionAction.choices,
        required=True,
        allow_null=True,
    )

    def validate(self, attrs):
        baseline = attrs.get("baseline", False) or False
        action = attrs.get("action", None) or None
        if not baseline and not action:
            raise serializers.ValidationError(
                "You must specify action if `baseline` is False."
            )

        if baseline and action:
            raise serializers.ValidationError(
                "The fields `baseline` and `action` are mutually exclusive."
            )

        return super().validate(attrs=attrs)
